# PROJECT_CONTEXT.md

## Regla de Oro (Fuente Única)
Este archivo es la **única fuente de verdad operativa** para contexto del proyecto.
Todo modelo o persona que trabaje aquí debe:
1. Leer este archivo primero.
2. Tratar cualquier otro doc como secundario si entra en conflicto.
3. Actualizar este archivo cuando cambie algo importante (arquitectura, contratos, datos, features).

## Propósito
Aplicación de control de gastos personal y compartido por "items" (ej. mes, viaje), con autenticación, gestión de participantes y gastos.

## Stack y estructura
- Frontend: React + Vite (`frontend/`)
- Backend: FastAPI + SQLAlchemy (`backend/`)
- DB: SQLite local por defecto, PostgreSQL en producción (`backend/database.py`)
- Deploy: Docker/Docker Compose + Easypanel

## Arquitectura actual (resumen)
- API principal en `backend/main.py` (auth, items, participantes, gastos, plantillas, presupuestos por usuario-item).
- Modelos en `backend/models.py`.
- Schemas en `backend/schemas.py`.
- Frontend con rutas protegidas en `frontend/src/App.jsx`.
- Cliente HTTP central en `frontend/src/services/api.js`.
- Estado de sesión en `frontend/src/context/AuthContext.jsx`.

## Endpoints clave
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Items: `/api/items` + CRUD
- Participantes: `/api/items/{item_id}/participants`
- Presupuesto por usuario/item: `/api/items/{item_id}/budget`
- Gastos: `/api/items/{item_id}/expenses` + toggle settled
- Plantillas: `/api/expense-templates` + reorder

## Estado actual del repo
- Worktree con cambios sin commit en backend y frontend (feature de gastos/cuotas/settled en progreso).
- Hay artefactos locales presentes (`backend/venv`, `frontend/node_modules`, `frontend/dist`).

## Funcionalidades actuales (código local)
- Autenticación: registro, login JWT, sesión persistida.
- Items: crear, listar, editar (incluye archivar), eliminar.
- Participantes: invitación por email, pendientes para usuarios no registrados, remoción por owner.
- Gastos: CRUD, moneda por gasto, división (`divided`, `assigned`, `selected`), fecha/hora.
- Presupuesto personal por usuario-item (no presupuesto global del item).
- Plantillas de gasto por usuario (máximo 8), edición y reordenamiento.
- Offline parcial en frontend: crear gastos offline y sincronizar después.
- Estado "saldado" por gasto.
- Cuotas: campos de cuota y creación automática de siguiente cuota en item destino o item nuevo.
- Resumen por item con IA: categorización de gastos, agregado por moneda y visualización en gráficos de barras y pie.

## Convención de actualización (importante)
Actualizar este archivo **solo cuando haya cambios importantes**:
1. Cambio de arquitectura o flujo.
2. Nuevos endpoints o cambios de contrato.
3. Migraciones/cambios de datos.
4. Decisiones técnicas relevantes.
5. Features grandes terminadas o descartadas.

## Bitácora de cambios importantes
- 2026-03-21: Se crea este archivo único de contexto para onboarding rápido de cualquier modelo de IA.
- 2026-03-21: Se formaliza este archivo como fuente única de verdad y se añade snapshot funcional.
- 2026-03-21: Migraciones destructivas (`DROP COLUMN`) quedan deshabilitadas por defecto. Solo se ejecutan con `ALLOW_DESTRUCTIVE_MIGRATIONS=true`.
- 2026-03-21: Corregido y desplegado el orden automático de gastos por item (más nuevo a más antiguo), validado en producción.
- 2026-03-21: Se agrega vista "Resumen IA" por item (backend+frontend) con generación manual y persistencia de snapshot.

## Checklist rápido para IA
1. Leer este archivo completo.
2. Revisar `git status` para ver trabajo en progreso.
3. Revisar `backend/main.py`, `backend/models.py`, `frontend/src/services/api.js` para entender contratos reales.
