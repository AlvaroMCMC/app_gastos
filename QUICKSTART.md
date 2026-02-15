# Quick Start Guide

Guía rápida para poner en marcha la aplicación en 5 minutos.

## Paso 1: Base de Datos

Crea la base de datos PostgreSQL:

```bash
# Opción 1: Con psql
psql -U postgres
CREATE DATABASE app_gastos;
\q

# Opción 2: Con createdb
createdb app_gastos
```

## Paso 2: Backend

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar .env
cp .env.example .env
# Edita .env con tus credenciales:
# DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/app_gastos

# Ejecutar (las tablas se crean automáticamente)
python main.py
```

✅ Backend corriendo en http://localhost:8000

## Paso 3: Frontend

Abre una **nueva terminal**:

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar
npm run dev
```

✅ Frontend corriendo en http://localhost:5173

## Paso 4: ¡Usar la app!

1. Abre http://localhost:5173
2. Regístrate con tu email
3. Crea tu primer item (ej: "Febrero 2026")
4. Agrega gastos

## Solución de Problemas

### Error de conexión a PostgreSQL
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `backend/.env`
- El formato es: `postgresql://usuario:password@localhost:5432/app_gastos`

### Error "Module not found" en Python
```bash
pip install -r requirements.txt
```

### Error en npm install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Puerto 8000 u 5173 ya en uso
```bash
# Backend: cambiar puerto en main.py última línea
uvicorn.run(app, host="0.0.0.0", port=8001)

# Frontend: cambiar en vite.config.js
server: { port: 5174 }
```

## Comandos Útiles

### Ver logs del backend
```bash
cd backend
python main.py
```

### Ver API docs
http://localhost:8000/docs

### Reiniciar todo
```bash
# Terminal 1 (Backend)
Ctrl+C
python main.py

# Terminal 2 (Frontend)
Ctrl+C
npm run dev
```

## Siguiente Paso

Lee el [README.md](README.md) completo para más detalles sobre la arquitectura y desarrollo.
