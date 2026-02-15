# PRD - Aplicación de Control de Gastos

## 1. Visión General

### 1.1 Descripción del Producto
Aplicación web de control de gastos personales y compartidos que permite a usuarios individuales y parejas gestionar sus finanzas de manera inteligente, establecer presupuestos mensuales y realizar un seguimiento detallado de sus gastos.

### 1.2 Objetivos
- Ayudar a usuarios a tomar control de sus finanzas personales
- Facilitar la gestión de gastos compartidos en parejas
- Proporcionar visibilidad clara del estado financiero mensual
- Prevenir gastos excesivos mediante alertas y visualizaciones
- Simplificar el cálculo de deudas entre miembros de un grupo

### 1.3 Usuarios Objetivo
- **Usuario Individual**: Persona que quiere controlar sus gastos personales
- **Pareja/Grupo**: Dos personas que comparten gastos y necesitan dividirlos equitativamente

---

## 2. Stack Tecnológico

### Frontend
- **React**: Framework principal para la interfaz de usuario
- **Bibliotecas de gráficos**: Para visualización de datos (Chart.js, Recharts, o similar)

### Backend
- **FastAPI**: Framework de Python para API REST

### Base de Datos
- **PostgreSQL**: Base de datos relacional

---

## 3. Características Principales

### 3.1 Gestión de Presupuesto
**Descripción**: Sistema de presupuesto mensual actualizable con diferentes tipos de ingresos.

**Funcionalidades**:
- Crear presupuesto mensual
- Actualizar presupuesto con ingresos:
  - Sueldo
  - Ganancias extras
  - Ingresos pasivos
- Visualizar presupuesto total disponible
- Historial de presupuestos por mes

### 3.2 Registro de Gastos
**Descripción**: Sistema flexible para registrar gastos con múltiples atributos.

**Funcionalidades**:
- Agregar gasto con los siguientes campos:
  - Monto
  - Descripción
  - Categoría (alimentación, transporte, entretenimiento, etc.)
  - Método de pago: Banco o Efectivo
  - Fecha
  - Pagador (quién realizó el gasto)

### 3.3 División de Gastos (Modo Pareja/Grupo)
**Descripción**: Lógica similar a Splitwise para dividir gastos entre miembros.

**Opciones de división**:
1. **Gasto compartido 50/50**: La otra persona debe su mitad al pagador
2. **Gasto total del otro**: El otro miembro debe el monto completo
3. **Gasto personal**: Solo afecta al presupuesto del pagador

**Funcionalidades**:
- Calcular automáticamente deudas entre miembros
- Ver balance de "quién debe a quién"
- Historial de gastos compartidos
- Liquidar deudas (marcar como pagado)

### 3.4 Visualización y Análisis
**Descripción**: Dashboards y gráficos para entender el estado financiero.

**Visualizaciones**:
- **Gráfico de presupuesto restante**:
  - Barra de progreso del presupuesto mensual
  - Comparación presupuesto inicial vs. gastado
- **Gráfico de gastos por categoría**: Pie chart o bar chart
- **Tendencia de gastos**: Gráfico de línea mostrando gastos diarios/semanales
- **Proyección de fin de mes**: Estimación de saldo final basado en tendencia

**Información numérica**:
- Presupuesto inicial del mes
- Total gastado
- Presupuesto restante
- Promedio de gasto diario
- Días restantes del mes
- Balance con pareja (si aplica)

### 3.5 Alertas y Notificaciones
- Alerta cuando se alcance 70% del presupuesto
- Alerta cuando se alcance 90% del presupuesto
- Alerta cuando se exceda el presupuesto
- Notificación de gasto pendiente de división

---

## 4. Requisitos Funcionales

### RF-001: Autenticación y Usuarios
- Los usuarios deben poder registrarse con email y contraseña
- Los usuarios deben poder iniciar sesión
- Los usuarios deben poder crear/unirse a un grupo (pareja)

### RF-002: Gestión de Presupuesto
- El sistema debe permitir crear un presupuesto mensual
- El sistema debe permitir agregar ingresos de diferentes tipos
- El presupuesto debe reiniciarse automáticamente cada mes
- El usuario debe poder editar/actualizar el presupuesto del mes actual

### RF-003: Gestión de Gastos
- El usuario debe poder agregar un gasto con todos sus atributos
- El usuario debe poder editar gastos existentes
- El usuario debe poder eliminar gastos
- El sistema debe actualizar automáticamente el presupuesto restante al agregar/editar/eliminar gastos

### RF-004: División de Gastos
- El sistema debe calcular automáticamente la deuda según el tipo de división
- El sistema debe mantener un balance actualizado entre miembros
- Los usuarios deben poder marcar deudas como liquidadas
- El sistema debe mostrar un historial de transacciones entre miembros

### RF-005: Visualización
- El sistema debe mostrar gráficos actualizados en tiempo real
- El dashboard debe mostrar métricas clave del mes actual
- Los usuarios deben poder filtrar gastos por fecha, categoría, método de pago
- El sistema debe generar reportes mensuales

### RF-006: Categorías
- El sistema debe tener categorías predefinidas de gastos
- Los usuarios deben poder crear categorías personalizadas
- Cada gasto debe tener una categoría asignada

---

## 5. Requisitos No Funcionales

### RNF-001: Rendimiento
- La aplicación debe cargar en menos de 2 segundos
- Las operaciones CRUD deben ejecutarse en menos de 500ms
- Los gráficos deben renderizarse en menos de 1 segundo

### RNF-002: Seguridad
- Las contraseñas deben estar hasheadas (bcrypt o similar)
- Las sesiones deben usar tokens JWT
- La API debe implementar rate limiting
- Todas las comunicaciones deben ser HTTPS en producción

### RNF-003: Usabilidad
- La interfaz debe ser responsive (mobile-first)
- La aplicación debe ser intuitiva y fácil de usar
- Debe haber feedback visual inmediato para cada acción

### RNF-004: Escalabilidad
- La base de datos debe estar normalizada
- La API debe ser RESTful y seguir mejores prácticas
- El código debe ser modular y mantenible

---

## 6. Modelo de Datos Propuesto

### Tabla: Users
- `id`: UUID (PK)
- `email`: String (unique)
- `password_hash`: String
- `name`: String
- `created_at`: Timestamp

### Tabla: Groups
- `id`: UUID (PK)
- `name`: String
- `created_at`: Timestamp

### Tabla: UserGroups
- `id`: UUID (PK)
- `user_id`: UUID (FK -> Users)
- `group_id`: UUID (FK -> Groups)
- `role`: Enum (owner, member)
- `joined_at`: Timestamp

### Tabla: Budgets
- `id`: UUID (PK)
- `user_id`: UUID (FK -> Users) o `group_id`: UUID (FK -> Groups)
- `month`: Date (YYYY-MM)
- `total_amount`: Decimal
- `created_at`: Timestamp

### Tabla: Incomes
- `id`: UUID (PK)
- `budget_id`: UUID (FK -> Budgets)
- `type`: Enum (sueldo, ganancia_extra, pasivo)
- `amount`: Decimal
- `description`: String
- `date`: Date
- `created_at`: Timestamp

### Tabla: Categories
- `id`: UUID (PK)
- `name`: String
- `icon`: String (opcional)
- `user_id`: UUID (FK -> Users) nullable (null = categoría global)
- `created_at`: Timestamp

### Tabla: Expenses
- `id`: UUID (PK)
- `budget_id`: UUID (FK -> Budgets)
- `category_id`: UUID (FK -> Categories)
- `amount`: Decimal
- `description`: String
- `payment_method`: Enum (banco, efectivo)
- `paid_by`: UUID (FK -> Users)
- `date`: Date
- `split_type`: Enum (personal, shared_half, full_other)
- `created_at`: Timestamp

### Tabla: ExpenseDebts
- `id`: UUID (PK)
- `expense_id`: UUID (FK -> Expenses)
- `debtor_id`: UUID (FK -> Users)
- `creditor_id`: UUID (FK -> Users)
- `amount`: Decimal
- `settled`: Boolean
- `settled_at`: Timestamp (nullable)
- `created_at`: Timestamp

---

## 7. Casos de Uso Principales

### CU-001: Usuario registra gasto personal
1. Usuario inicia sesión
2. Usuario navega a "Agregar Gasto"
3. Usuario completa el formulario:
   - Monto: $50
   - Descripción: "Supermercado"
   - Categoría: "Alimentación"
   - Método: "Banco"
   - División: "Personal"
4. Sistema guarda el gasto
5. Sistema actualiza presupuesto restante
6. Sistema muestra confirmación y actualiza dashboard

### CU-002: Pareja registra gasto compartido
1. Usuario A (en grupo con Usuario B) agrega gasto
2. Completa formulario:
   - Monto: $100
   - Descripción: "Cena restaurante"
   - División: "Compartido 50/50"
3. Sistema crea el gasto
4. Sistema calcula deuda: Usuario B debe $50 a Usuario A
5. Sistema actualiza balance entre usuarios
6. Ambos usuarios ven el gasto en su historial

### CU-003: Configurar presupuesto mensual
1. Usuario navega a "Presupuesto"
2. Sistema verifica si existe presupuesto para el mes actual
3. Si no existe, usuario crea nuevo presupuesto
4. Usuario agrega ingresos:
   - Sueldo: $2000
   - Ganancia extra: $300
5. Sistema calcula presupuesto total: $2300
6. Sistema muestra presupuesto disponible en dashboard

### CU-004: Ver balance y liquidar deuda
1. Usuario navega a "Balance con Pareja"
2. Sistema muestra: "Le debes $150 a [Pareja]"
3. Usuario hace pago fuera de la app
4. Usuario marca deuda como liquidada
5. Sistema actualiza balance a $0
6. Sistema registra la liquidación con timestamp

---

## 8. Flujos de Usuario

### Flujo: Primer uso de la aplicación
1. Landing page con login/registro
2. Registro → Verificación email (opcional)
3. Onboarding:
   - ¿Usar solo o en pareja?
   - Si pareja: invitar o unirse con código
4. Configurar primer presupuesto
5. Tour de funcionalidades
6. Dashboard principal

### Flujo: Uso diario típico
1. Abrir app → Dashboard
2. Ver resumen rápido: presupuesto restante, gastos del día
3. Agregar gasto rápido (botón flotante)
4. Ver gráfico actualizado
5. Revisar balance con pareja (si aplica)

---

## 9. Pantallas Principales

### 9.1 Dashboard
- Resumen de presupuesto (gráfico de dona o barra)
- Presupuesto restante (número grande destacado)
- Gastos recientes (lista de últimos 5)
- Balance con pareja
- Botón flotante "Agregar Gasto"

### 9.2 Agregar/Editar Gasto
- Formulario con todos los campos
- Selector de categoría con iconos
- Toggle banco/efectivo
- Selector de tipo de división (si está en grupo)
- Botón guardar

### 9.3 Presupuesto
- Presupuesto total del mes
- Lista de ingresos
- Botón "Agregar Ingreso"
- Historial de presupuestos anteriores

### 9.4 Historial
- Lista de todos los gastos con filtros
- Búsqueda por descripción
- Filtros: fecha, categoría, método de pago, pagador
- Opciones de editar/eliminar cada gasto

### 9.5 Balance (Modo Pareja)
- Resumen: "Debes X" o "Te deben X"
- Detalle de gastos pendientes
- Botón "Marcar como pagado"
- Historial de liquidaciones

### 9.6 Estadísticas
- Gráfico de gastos por categoría
- Tendencia de gastos en el tiempo
- Comparación mes a mes
- Proyección de fin de mes

---

## 10. MVP - Estructura Simplificada

### Vista 1: Login
- Pantalla de login con correo electrónico y contraseña
- Registro de nuevos usuarios
- Sin verificación de email (simplificado)

### Vista 2: Items Creados (Dashboard)
- Lista de todos los "items" del usuario
- Cada item es independiente (ej: "Marzo 2026", "Vacaciones", etc.)
- Cada item tiene:
  - Nombre
  - Tipo: Personal o Compartido (con más gente)
  - Fecha de creación
- Botón para crear nuevo item
- Click en item para ver sus gastos

### Vista 3: Gastos del Item
- Lista de gastos del item seleccionado
- Información del item (nombre, tipo)
- CRUD completo de gastos:
  - **Agregar**: Formulario con monto, descripción, método de pago, quién pagó
  - **Editar**: Modificar gasto existente
  - **Eliminar**: Borrar gasto
- Resumen simple: Total gastado
- Botón para volver a la lista de items

### Roadmap Futuro (Post-MVP)
#### Fase 2: Presupuestos y Visualizaciones
- Agregar presupuesto por item
- Gráficos de gastos
- Alertas de presupuesto

#### Fase 3: División de Gastos
- Lógica Splitwise
- Cálculo de deudas
- Balance entre usuarios

#### Fase 4: Mejoras
- Categorías
- Reportes
- Exportar datos

---

## 11. Métricas de Éxito

- **Adopción**: Número de usuarios registrados
- **Engagement**: Frecuencia de registro de gastos (ideal: diario)
- **Retención**: Usuarios activos mes a mes
- **Funcionalidad clave**: % de usuarios que usan modo pareja
- **Satisfacción**: Usuarios que completan el mes sin exceder presupuesto

---

## 12. Riesgos y Consideraciones

### Riesgos Técnicos
- Sincronización de datos en tiempo real entre usuarios de un grupo
- Manejo de diferentes zonas horarias
- Concurrencia en actualización de presupuestos

### Consideraciones de UX
- Facilitar el registro rápido de gastos (máximo 3 taps)
- Evitar sobrecarga de información en dashboard
- Hacer que la división de gastos sea clara y sin confusión

### Privacidad
- Los datos financieros son sensibles
- Implementar encriptación de datos sensibles
- Política de privacidad clara
- Opción de eliminar cuenta y todos los datos

---

## 13. Preguntas Abiertas

- ¿Se permitirán grupos de más de 2 personas?
- ¿Se implementará sincronización con bancos (open banking)?
- ¿Habrá una aplicación móvil nativa o solo web responsive?
- ¿Se necesita modo offline?
- ¿Los presupuestos son individuales o compartidos en modo pareja?

---

## Apéndices

### A. Referencias
- Splitwise: https://www.splitwise.com/
- YNAB (You Need A Budget): https://www.youneedabudget.com/
- Wallet by BudgetBakers

### B. Recursos de Diseño
- Paleta de colores: Considerar verde (ingreso), rojo (gasto), azul (neutral)
- Iconos: Material Icons, Font Awesome
- Tipografía: Sans-serif moderna y legible

---

**Versión**: 1.0
**Fecha**: 2026-02-14
**Autor**: Product Team
**Estado**: Borrador Inicial
