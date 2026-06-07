# Guía de despliegue en Digital Ocean Droplet

Guía práctica para desplegar cualquier app web (frontend + backend + DB externa) en un VPS de Digital Ocean con HTTPS automático via Traefik.

---

## Arquitectura general

```
Internet
   │
   ▼ :80 / :443
┌──────────────────────────────────────┐
│  Traefik v2.11  (reverse proxy)      │  ← única puerta de entrada
│  Red: traefik-public                 │  ← red Docker externa compartida
└───────────────┬──────────────────────┘
                │ proxy por labels
      ┌─────────▼──────────┐
      │  Frontend  (Nginx) │  ← conectado a traefik-public + red interna
      └─────────┬──────────┘
                │ /api/*
      ┌─────────▼──────────┐
      │  Backend  (API)    │  ← solo red interna
      └─────────┬──────────┘
                │
      ┌─────────▼──────────┐
      │  DB externa        │  ← Supabase, PlanetScale, etc.
      └────────────────────┘
```

**Regla clave:** solo Traefik expone puertos al host. El frontend y backend no publican puertos directamente.

---

## 1. Preparar el droplet

### Requisitos mínimos
- Ubuntu 22.04 LTS
- 1 GB RAM mínimo (2 GB recomendado si hay builds Docker)
- Docker + Docker Compose plugin instalados

### Instalar Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### Estructura de carpetas en el servidor
```
/opt/apps/
├── traefik/
│   ├── docker-compose.yml
│   └── (volumen externo: traefik_certs)
└── nombre-app/
    ├── backend/
    ├── frontend/
    ├── docker-compose.yml
    └── deploy/
        └── .env          ← NUNCA en git
```

---

## 2. Configurar Traefik (una sola vez por servidor)

Traefik actúa como proxy para todas las apps del servidor. Se configura una vez y luego cada app se registra automáticamente via labels en su docker-compose.

### Crear la red compartida
```bash
docker network create traefik-public
```

### `/opt/apps/traefik/docker-compose.yml`
```yaml
services:
  traefik:
    image: traefik:v2.11
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.email=TU_EMAIL@dominio.com
      - --certificatesresolvers.le.acme.storage=/certs/acme.json
      - --certificatesresolvers.le.acme.tlschallenge=true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/certs
    restart: unless-stopped
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true

volumes:
  traefik_certs:
```

```bash
cd /opt/apps/traefik && docker compose up -d
```

> **Importante:** usa `traefik:v2.11`, no `traefik:latest` ni `v3.x`. La v3 puede tener incompatibilidades con la API de Docker del droplet.

---

## 3. Docker Compose de la app

### Plantilla base
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      SECRET_KEY: ${SECRET_KEY}
    restart: unless-stopped
    networks:
      - default          # solo red interna

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - default          # red interna (para llegar al backend)
      - traefik-public   # red externa (para que Traefik llegue al frontend)
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik-public          # ← CRÍTICO, ver errores frecuentes
      # HTTPS
      - traefik.http.routers.NOMBRE.rule=Host(`subdominio.dominio.com`)
      - traefik.http.routers.NOMBRE.entrypoints=websecure
      - traefik.http.routers.NOMBRE.tls.certresolver=le
      - traefik.http.services.NOMBRE.loadbalancer.server.port=80
      # Redirect HTTP → HTTPS
      - traefik.http.routers.NOMBRE-http.rule=Host(`subdominio.dominio.com`)
      - traefik.http.routers.NOMBRE-http.entrypoints=web
      - traefik.http.routers.NOMBRE-http.middlewares=https-redirect
      - traefik.http.middlewares.https-redirect.redirectscheme.scheme=https
      - traefik.http.middlewares.https-redirect.redirectscheme.permanent=true

networks:
  default:
    driver: bridge
  traefik-public:
    external: true
```

> Reemplaza `NOMBRE` por un slug único por app (ej: `gastos`, `blog`, `api`). Debe ser único en todo el servidor.

---

## 4. Variables de entorno

### `.env.example` (sí va en git)
```env
DATABASE_URL=postgresql://user:PASSWORD@host:5432/db?sslmode=require
SECRET_KEY=genera-clave-aleatoria-larga-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
VITE_API_URL=/api
```

### `deploy/.env` (NUNCA en git)
Copia del `.env.example` con valores reales. Añadir al `.gitignore`:
```
deploy/.env
.env
```

### Desplegar con env file explícito
```bash
docker compose --env-file deploy/.env up -d --build
```

---

## 5. Configurar DNS

### En Digital Ocean (o el proveedor DNS)

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `@` | IP del droplet | 3600 |
| A | `subdominio` | IP del droplet | 3600 |
| CNAME | `www` | `@` | 3600 |

Para múltiples apps en el mismo droplet, cada una tendrá su propio subdominio apuntando a la misma IP. Traefik distingue por el `Host()` en los labels.

### Verificar propagación
```bash
nslookup subdominio.dominio.com
# o
dig subdominio.dominio.com +short
```

> El certificado SSL no se emitirá hasta que el DNS propague correctamente.

---

## 6. Workflow de deploy

### Setup inicial (una sola vez)
```bash
cd /opt/apps
git clone https://github.com/usuario/repo.git nombre-app
cp nombre-app/deploy/.env.example nombre-app/deploy/.env
nano nombre-app/deploy/.env   # rellenar valores reales
```

### `deploy/deploy.sh`
```bash
#!/bin/bash
set -e
REPO_DIR="/opt/apps/nombre-app"
ENV_FILE="$REPO_DIR/deploy/.env"

cd "$REPO_DIR"
[ ! -f "$ENV_FILE" ] && echo "ERROR: No existe $ENV_FILE" && exit 1

git pull origin master
docker compose --env-file "$ENV_FILE" up -d --build
docker compose --env-file "$ENV_FILE" ps
```

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

---

## 7. Base de datos externa (Supabase)

### Problema: Supabase solo tiene IPv6

El endpoint directo `db.xxx.supabase.co` resuelve únicamente a una dirección IPv6. Los contenedores Docker no tienen IPv6 por defecto → la conexión falla silenciosamente o da timeout.

### Solución: habilitar IPv6 en Docker

**1. Editar `/etc/docker/daemon.json`:**
```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/80",
  "ip6tables": true
}
```

**2. Reiniciar Docker:**
```bash
systemctl restart docker
```

**3. Añadir regla NAT66 (masquerade para tráfico IPv6 saliente):**
```bash
ip6tables -t nat -A POSTROUTING -s fd00::/80 ! -d fd00::/80 -j MASQUERADE
```

**4. Hacer la regla persistente** (se pierde al reiniciar sin esto):
```bash
apt-get install -y iptables-persistent
netfilter-persistent save
```

**5. Declarar IPv6 en el docker-compose de la app:**
```yaml
networks:
  default:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: "172.20.0.0/16"
        - subnet: "fd02::/80"    # subred IPv6 interna única por app
```

> Asigna subredes IPv6 diferentes a cada app (`fd02`, `fd03`, `fd04`...) para evitar conflictos.

---

## 8. Errores frecuentes y soluciones

### HTTPS carga pero después da timeout
**Síntoma:** `curl -I https://subdominio.com` se queda colgado ~10s y da 499.
**Causa:** Traefik tiene dos redes para llegar al contenedor y elige la red interna, a la que Traefik no tiene acceso.
**Solución:** Añadir el label en el frontend:
```yaml
- traefik.docker.network=traefik-public
```

---

### El certificado SSL no se emite
**Síntoma:** El navegador muestra "certificado no válido" o el certificado es el self-signed de Traefik.
**Causas posibles:**
- DNS aún no propagó. Esperar 5-30 min y verificar con `nslookup`.
- Let's Encrypt no puede alcanzar el servidor en el puerto 443. Verificar que no hay firewall bloqueando.
- Se agotó el rate limit de Let's Encrypt (5 certificados por dominio cada 7 días en producción). Usar staging para pruebas.

**Verificar si el certificado se emitió:**
```bash
docker exec traefik-traefik-1 cat /certs/acme.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
certs=d.get('le',{}).get('Certificates',[])
print(f'{len(certs)} certificado(s)')
[print(' -', c.get('domain',{}).get('main','?')) for c in certs]
"
```

---

### `docker compose restart` no aplica cambios de .env
**Causa:** `restart` recrea los procesos pero no re-lee variables de entorno ni rebuilds.
**Solución siempre usar:**
```bash
docker compose --env-file deploy/.env up -d --build
```

---

### Backend no conecta a Supabase (o DB externa por IPv6)
**Síntoma:** backend arranca pero los logs muestran timeout o "no route to host".
**Verificar:** `nslookup db.xxx.supabase.co` desde el servidor. Si devuelve solo IPv6 y docker no tiene IPv6, falla.
**Solución:** ver sección 7.

---

### Puerto 80/443 ya en uso al arrancar Traefik
**Síntoma:** `Error starting userland proxy: listen tcp 0.0.0.0:80: bind: address already in use`
**Causa:** Algún contenedor de la app tiene `ports: "80:80"` en su docker-compose.
**Solución:** Quitar todos los `ports:` del frontend y backend. Solo Traefik expone puertos al host. Los contenedores se comunican por las redes Docker internas.

---

### Traefik v3 incompatible con Docker antiguo
**Síntoma:** `client version 1.24 is too old. Minimum supported API version is 1.40`
**Solución:** Usar `traefik:v2.11` en lugar de `traefik:latest` o `v3.x`.

---

### El backend no puede conectar al backend desde el frontend (nginx proxy)
**Síntoma:** Las llamadas a `/api/*` devuelven 502.
**Causa:** En el `nginx.conf` del frontend, el proxy apunta a `backend` (nombre del servicio Docker). Esto funciona solo si ambos están en la misma red Docker.
**Verificar:** que frontend y backend comparten la red `default` en docker-compose.

---

## 9. Diagnóstico rápido

```bash
# Estado de todos los contenedores
docker ps

# Logs de Traefik en tiempo real
docker logs traefik-traefik-1 -f --tail=50

# Logs del backend
docker logs app-NOMBRE-backend-1 -f --tail=50

# Probar HTTPS desde el propio servidor
curl -I --max-time 10 https://subdominio.dominio.com/

# Verificar que Traefik alcanza el frontend
docker exec traefik-traefik-1 wget -qO- http://172.19.0.3:80 | head -3

# Ver IPs de un contenedor en cada red
docker inspect nombre-contenedor --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}: {{$v.IPAddress}}\n{{end}}'

# Ver redes disponibles
docker network ls

# Ver qué contenedores están en una red
docker network inspect traefik-public | grep -E "Name|IPv4"
```

---

## 10. Checklist de deploy

- [ ] Dominio apunta a la IP del droplet (DNS propagado)
- [ ] Red `traefik-public` creada en Docker
- [ ] Traefik corriendo con `traefik:v2.11`
- [ ] `deploy/.env` creado en el servidor con valores reales
- [ ] `docker-compose.yml` tiene `traefik.docker.network=traefik-public` en el frontend
- [ ] Frontend y backend NO tienen `ports:` (solo Traefik los expone)
- [ ] IPv6 configurado si la DB solo tiene dirección IPv6
- [ ] Regla NAT66 persistente (`netfilter-persistent save`)
- [ ] HTTPS responde con certificado válido de Let's Encrypt
- [ ] La app carga correctamente en el navegador

---

## 11. Agregar una segunda app al mismo servidor

1. Clonar el nuevo repo en `/opt/apps/nueva-app/`
2. Crear `deploy/.env` con sus propias credenciales
3. Usar un nombre de router Traefik diferente en los labels (ej: `nueva-app` en lugar de `gastos`)
4. Usar una subred IPv6 diferente (ej: `fd03::/80`)
5. El subdominio nuevo apunta a la misma IP del droplet — Traefik distingue por `Host()`
6. `docker compose --env-file deploy/.env up -d --build`

No hace falta tocar la configuración de Traefik ni de otras apps.
