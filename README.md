# App Gastos - MVP

Aplicación de control de gastos personal y compartido. Permite crear "items" independientes (como "Marzo 2026" o "Vacaciones") y gestionar gastos dentro de cada uno.

## Stack Tecnológico

- **Frontend**: React + Vite
- **Backend**: FastAPI (Python)
- **Base de Datos**: PostgreSQL

## Características del MVP

### Vista 1: Login
- Autenticación con correo y contraseña
- Registro de nuevos usuarios
- JWT para sesiones

### Vista 2: Items (Dashboard)
- Crear items personales o compartidos
- Cada item es independiente
- Ver lista de todos los items
- Eliminar items

### Vista 3: Gastos
- Ver todos los gastos de un item
- Agregar nuevos gastos (monto, descripción, método de pago, fecha)
- Editar gastos existentes
- Eliminar gastos
- Ver total gastado

## Instalación y Setup

### Requisitos Previos

- Python 3.9+
- Node.js 18+
- PostgreSQL 14+

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd app_gastos
```

### 2. Setup Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Crear base de datos PostgreSQL
# createdb app_gastos

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Ejecutar servidor
python main.py
```

El backend estará en: http://localhost:8000

Documentación API: http://localhost:8000/docs

### 3. Setup Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

El frontend estará en: http://localhost:5173

## Uso de la Aplicación

1. **Registro**: Crea una cuenta con tu email
2. **Login**: Inicia sesión
3. **Crear Item**: En el dashboard, haz clic en "Crear nuevo item"
   - Nombre: Ej. "Marzo 2026", "Vacaciones Europa", etc.
   - Tipo: Personal o Compartido
4. **Ver Gastos**: Haz clic en "Ver Gastos" de un item
5. **Agregar Gastos**:
   - Click en "+ Agregar Gasto"
   - Completa el formulario
   - Elige método de pago: Banco o Efectivo
6. **Editar/Eliminar**: Usa los botones en cada gasto

## Modelo de Datos

### Users
- id, email, password, name

### Items
- id, name, item_type (personal/shared), owner_id

### Expenses
- id, item_id, amount, description, payment_method, paid_by, date

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual

### Items
- `GET /api/items` - Listar items
- `POST /api/items` - Crear item
- `GET /api/items/{id}` - Obtener item
- `PUT /api/items/{id}` - Actualizar item
- `DELETE /api/items/{id}` - Eliminar item

### Expenses
- `GET /api/items/{id}/expenses` - Listar gastos
- `POST /api/items/{id}/expenses` - Crear gasto
- `PUT /api/items/{id}/expenses/{expense_id}` - Actualizar gasto
- `DELETE /api/items/{id}/expenses/{expense_id}` - Eliminar gasto

## Próximas Funcionalidades (Post-MVP)

- Presupuestos por item
- Gráficos y visualizaciones
- División de gastos (Splitwise-style)
- Categorías de gastos
- Reportes mensuales
- Exportar datos
- Notificaciones
- PWA (app móvil)

## Estructura del Proyecto

```
app_gastos/
├── backend/
│   ├── main.py           # API FastAPI
│   ├── models.py         # Modelos SQLAlchemy
│   ├── schemas.py        # Schemas Pydantic
│   ├── database.py       # Configuración DB
│   ├── auth.py           # JWT y autenticación
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Vistas principales
│   │   ├── context/      # AuthContext
│   │   ├── services/     # API client
│   │   └── styles/       # CSS
│   ├── package.json
│   └── vite.config.js
├── prd.md               # Product Requirements Document
└── README.md
```

## Desarrollo

### Backend
```bash
cd backend
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm run dev
```

## Build para Producción

### Backend
```bash
# Configurar variables de entorno de producción
# Desplegar con gunicorn o similar
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
```bash
npm run build
# Los archivos estarán en frontend/dist/
```

## Licencia

MIT

## Contacto

[Tu información de contacto]
