# Guía para Claude Code - Az TOOLS AND MORE

Este documento establece reglas y mejores prácticas para trabajar con este proyecto.

## 🚨 Deploy a Producción - Regla Crítica

**ANTES de hacer cualquier deploy (docker compose up/rebuild/restart):**

### Decisión Obligatoria:
```
¿Qué hacer con la BD?
A) Preservar (docker compose build + restart, SIN down -v)
B) Fresh start (docker compose down -v + up)
```

**NUNCA ejecutar `docker compose down -v` sin confirmación explícita.**

### Razón:
Incident 2026-09-30: Se eliminó la BD sin intención, perdiendo todos los datos permanentemente. No hay backups automáticos configurados actualmente.

### Procedimiento Seguro:

**Opción A - Preservar BD:**
```bash
docker compose build --no-cache backend frontend
docker compose restart backend frontend
```

**Opción B - Fresh BD (después de confirmar):**
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

## Estructura del Proyecto

- `backend/`: Django 6.0.6 + DRF
  - `cotizador_project/`: core + models (User, Organization)
  - `finanzas_app/`: Ingresos/Gastos/Deudas/Recibos
  - `clientes_app/`: Gestión de clientes
  - `servicios_app/`: Catálogo de servicios/productos
  - `cotizador_app/`: Motor de cotizaciones

- `frontend/`: React 18 + Vite
  - `src/pages/`: Páginas principales (Finanzas, Recibos, etc.)
  - `src/components/`: Componentes reutilizables

## Multi-Tenancy

Todos los modelos usan `organization` (FK Organization, CASCADE).

Todos los ViewSets usan `OrganizationFilterMixin` para filtrar por organización del user.

User personalizado: `cotizador_project.models.User` con FK a Organization.

## Autenticación

- Token-based (DRF TokenAuthentication)
- Permisos: `HasRolPermission` + `permiso_por_accion`
- Roles: admin, vendedor, gerente, contador, visualizador

## Commit Message Style

```
Módulo/Feature: breve descripción

- Detalle 1
- Detalle 2

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

## Versiones Clave

- Django: 6.0.6
- Python: 3.12
- Node: 20
- PostgreSQL: Latest
- WeasyPrint: PDF generation
