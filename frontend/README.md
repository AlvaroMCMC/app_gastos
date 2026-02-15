# Frontend - App Gastos

Aplicación React construida con Vite.

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Ejecutar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

### 3. Build para producción

```bash
npm run build
```

## Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables (futuro)
├── context/          # Context API (AuthContext)
├── pages/            # Páginas/Vistas
│   ├── Login.jsx     # Vista 1: Login y Registro
│   ├── Items.jsx     # Vista 2: Lista de items
│   └── Expenses.jsx  # Vista 3: Gastos de un item
├── services/         # Servicios de API
│   └── api.js        # Cliente axios y endpoints
├── styles/           # Estilos CSS por componente
├── App.jsx           # Router y rutas principales
└── main.jsx          # Punto de entrada

```

## Rutas

- `/login` - Autenticación (login/registro)
- `/items` - Lista de items del usuario
- `/items/:itemId/expenses` - Gastos de un item específico

## Features Implementadas

- ✅ Login y registro
- ✅ Gestión de items (crear, listar, eliminar)
- ✅ Gestión de gastos (CRUD completo)
- ✅ Cálculo de total gastado
- ✅ Diseño responsive
- ✅ Autenticación con JWT

## Próximas Features

- Categorías de gastos
- Gráficos de visualización
- Presupuestos por item
- División de gastos entre usuarios
- Modo oscuro
