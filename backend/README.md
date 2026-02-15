# Backend - App Gastos

API REST construida con FastAPI y PostgreSQL.

## Setup

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 2. Configurar base de datos

Crear una base de datos PostgreSQL:

```sql
CREATE DATABASE app_gastos;
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

Editar `.env`:
```
DATABASE_URL=postgresql://tu_usuario:tu_password@localhost:5432/app_gastos
SECRET_KEY=tu-clave-secreta-muy-segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 4. Ejecutar servidor

```bash
python main.py
```

O con uvicorn:
```bash
uvicorn main:app --reload
```

El servidor estará disponible en: http://localhost:8000

## Documentación API

FastAPI genera documentación automática:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints principales

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obtener usuario actual

### Items
- `GET /api/items` - Listar items del usuario
- `POST /api/items` - Crear item
- `GET /api/items/{item_id}` - Obtener item
- `PUT /api/items/{item_id}` - Actualizar item
- `DELETE /api/items/{item_id}` - Eliminar item

### Expenses
- `GET /api/items/{item_id}/expenses` - Listar gastos del item
- `POST /api/items/{item_id}/expenses` - Crear gasto
- `PUT /api/items/{item_id}/expenses/{expense_id}` - Actualizar gasto
- `DELETE /api/items/{item_id}/expenses/{expense_id}` - Eliminar gasto
