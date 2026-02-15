# 🔄 Configuración de Backups Automáticos

Este repositorio incluye un GitHub Action que hace backups automáticos de PostgreSQL.

## ⚙️ Configuración de Secrets

Para que funcione, necesitas configurar los siguientes **secrets** en GitHub:

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **"New repository secret"**
4. Agrega estos secrets:

### Secrets necesarios:

| Secret | Valor | Descripción |
|--------|-------|-------------|
| `DB_HOST` | `kguo1f.easypanel.host` | Hostname externo de PostgreSQL |
| `DB_PORT` | `5430` | Puerto expuesto de PostgreSQL |
| `DB_PASSWORD` | `4812560xxxA$` | Contraseña de PostgreSQL |

---

## 📅 Horario de Backups

Los backups se ejecutan **automáticamente** todos los días a las **2:00 AM UTC** (3:00 AM Lima, 6:00 AM España).

Puedes cambiar el horario editando el `cron` en `.github/workflows/database-backup.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Formato: minuto hora día mes día-semana
```

Ejemplos:
- `0 2 * * *` - Diario a las 2 AM
- `0 */6 * * *` - Cada 6 horas
- `0 0 * * 0` - Semanal (domingos a medianoche)

---

## 🚀 Ejecutar Backup Manualmente

1. Ve a tu repositorio en GitHub
2. Click en **Actions**
3. Selecciona **"Database Backup"** en el menú izquierdo
4. Click en **"Run workflow"**
5. Click en **"Run workflow"** (botón verde)

---

## 📦 Descargar Backups

Los backups se guardan como **artifacts** en GitHub:

1. Ve a **Actions** en tu repositorio
2. Click en una ejecución exitosa (✅)
3. Scroll down hasta **"Artifacts"**
4. Descarga el archivo `postgres-backup-XXX.zip`

**Nota**: Los artifacts se guardan por **7 días** (configurable en el workflow).

---

## 🔄 Restaurar un Backup

Para restaurar un backup:

```bash
# Descomprimir el archivo descargado
unzip postgres-backup-XXX.zip

# Restaurar en PostgreSQL
pg_restore \
  -h kguo1f.easypanel.host \
  -p 5430 \
  -U postgres \
  -d app_gastos \
  --clean \
  backup_YYYYMMDD_HHMMSS.sql

# Te pedirá la contraseña
```

---

## 💾 Alternativas de Almacenamiento

Si quieres guardar los backups en otro lugar (no solo GitHub Artifacts), puedes modificar el workflow para subir a:

### 1. Google Drive (gratis 15GB)
Usar action: `satackey/action-google-drive@v1`

### 2. Dropbox (gratis 2GB)
Usar action: `dropbox/dropbox-sdk-js`

### 3. Amazon S3 / Backblaze B2
Más económico que Google Drive para largo plazo

---

## ⚠️ Importante

- **Seguridad**: Los secrets de GitHub están encriptados y solo son visibles durante la ejecución del workflow
- **Límites GitHub Actions**: 2000 minutos/mes gratis (cada backup toma ~1 min)
- **Tamaño**: Los artifacts tienen un límite de 500MB por archivo (más que suficiente para esta DB)

---

## 📊 Monitoreo

Puedes recibir notificaciones de fallos configurando:
- **Email**: GitHub te notifica automáticamente si falla el workflow
- **Slack/Discord**: Agregar webhooks en el step de "Notify on Failure"

