# 🐳 Dockerización — Plan de Implementación

## Contexto

Decisión de arquitectura: el backend + frontend se desplegarán eventualmente vía Docker (en casa o para pequeña empresa bajo demanda), no en esta Mac. Por lo tanto:

- **Pendiente**: sincronización automática de FIBRAs (quedó en launchd local, será revertida; el mecanismo se resolverá dentro de Docker cuando esté listo).
- **Nuevo**: plan completo de Dockerización documentado aquí, listo para cuando se inicie esa tarea.

---

## Inventario del Repositorio Actual

### Backend (`backend/`)

**Dependencias (requirements.txt):**
- Django 6.0.6, DRF, `django-environ` (parcialmente usado)
- `psycopg2-binary` — instalado pero **sin usar** (hoy corre en SQLite)
- `pillow`, `weasyprint` ⚠️, `pymupdf`, `pypdf`, `mammoth`, `qrcode[pil]`
- **Sin servidor WSGI de producción** — falta `gunicorn`

**Configuración crítica (settings.py) — insegura hoy:**
- `SECRET_KEY` hardcodeada (nunca debería estar en repo en producción)
- `DEBUG = True` hardcodeado
- `ALLOWED_HOSTS = []` (vacío)
- `CORS_ALLOWED_ORIGINS` fijo a localhost
- `FRONTEND_URL` fijo a localhost:5173
- **Nada de esto se lee de variables de entorno** (salvo 3 vars de FIBRAs)

**Base de datos:**
- **SQLite** (`backend/db.sqlite3`) — funcional hoy pero frágil para múltiples workers/concurrencia
- Ya hay datos reales de usuario (logos en `backend/media/logos/`) — requiere volumen persistente

**Estáticos:**
- `STATIC_ROOT` definido pero nunca se corrió `collectstatic`
- No hay whitenoise ni nginx — necesita configuración en Docker

### Frontend (`frontend/`)

**Build & runtime:**
- npm, Vite 8, `npm run build` → `dist/`
- **Sin versión de Node fijada** en el repo
- Proxy `/api` en dev solo (no para producción)
- **Sin definición de cómo servir el build en producción** (nginx recomendado)

---

## Arquitectura Recomendada

### Servicios en `docker-compose.yml`

1. **`db` — PostgreSQL**
   - Imagen: `postgres:16-alpine`
   - Volumen: `postgres_data` (persistencia)
   - Variables de entorno: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

2. **`backend` — Django + Gunicorn**
   - Base: `python:3.12-slim`
   - Librerías de sistema para weasyprint: `libpango-1.0-0`, `libpangoft2-1.0-0`, `libcairo2`, `libgdk-pixbuf2.0-0`, fonts
   - `libpq5` para Postgres runtime
   - Entrypoint: corre `migrate` + `collectstatic` antes de levantar gunicorn
   - Volúmenes: `media`, `static`
   - Puerto: 8000

3. **`frontend` — Node + Nginx**
   - Multi-stage Dockerfile:
     - **Stage 1**: `node:20-alpine`, corre `npm ci && npm run build`
     - **Stage 2**: `nginx:alpine`, sirve `dist/` + proxy reverso `/api` → `backend:8000`
   - Archivo: `frontend/nginx.conf`
   - Puerto: 80 (o 3000 internamente, mapeado en compose)

4. **(Opcional, futuro) `sync` — Cron para FIBRAs**
   - Contenedor ligero con `supercronic` o `ofelia`
   - Dispara `sync_fibras` diariamente (resuelve pendiente de sincronización automática)

### Volúmenes

```yaml
volumes:
  postgres_data:       # BD persistente
  media:               # Logos/archivos subidos
  static:              # Generados por collectstatic
```

### Variables de Entorno a Externalizar

**Backend** (requiere cambios en `settings.py`):
```
SECRET_KEY                 # Generar nuevo para producción
DEBUG                      # false en prod
ALLOWED_HOSTS              # Configurable por env
CORS_ALLOWED_ORIGINS       # Configurable por env
FRONTEND_URL              # Configurable por env
DATABASE_URL              # postgresql://user:pass@db:5432/dbname (o separados)
```

**Frontend:**
```
VITE_API_BASE_URL         # URL base del backend (ej. http://backend:8000)
```

**Archivo `.env.example`** (documentar todas las variables esperadas)

---

## Cambios de Código Necesarios

### Backend

1. **`backend/requirements.txt`**
   - Agregar: `gunicorn`
   - Opcionalmente: `whitenoise` (si se sirven estáticos desde Django en vez de nginx)

2. **`backend/tools_and_more/settings.py`**
   - Cambiar `SECRET_KEY` → leer de `env('SECRET_KEY')`
   - Cambiar `DEBUG` → leer de `env.bool('DEBUG', default=False)`
   - Cambiar `ALLOWED_HOSTS` → leer de `env.list('ALLOWED_HOSTS')`
   - Cambiar `CORS_ALLOWED_ORIGINS` → leer de `env.list('CORS_ALLOWED_ORIGINS')`
   - Cambiar `FRONTEND_URL` → leer de `env('FRONTEND_URL')`
   - **Cambiar `DATABASES`** → leer desde `env('DATABASE_URL')` o separados (requiere `dj-database-url` opcional, o parse manual)
   - Usar `django-environ` completamente (ya está instalado)

3. **`backend/.dockerignore`** (crear)
   ```
   venv/
   __pycache__/
   *.pyc
   db.sqlite3
   media/
   logs/
   .git/
   .env
   ```

4. **`backend/Dockerfile`** (crear)
   - Base: `python:3.12-slim`
   - Instalar librerías de sistema para weasyprint
   - COPY requirements.txt, pip install
   - COPY código
   - Entrypoint: migrate, collectstatic, gunicorn

### Frontend

1. **`frontend/Dockerfile`** (crear, multi-stage)
   - Stage 1: `node:20-alpine` → npm ci && npm run build
   - Stage 2: `nginx:alpine` → COPY dist/ + nginx.conf

2. **`frontend/nginx.conf`** (crear)
   - Sirve `dist/` (SPA)
   - Proxy `/api` → `http://backend:8000`

3. **`.env.example`** en raíz (crear)
   - Documentar todas las variables de entorno del compose

### Raíz del Proyecto

1. **`docker-compose.yml`** (crear)
   - 3 servicios (db, backend, frontend)
   - Volúmenes nombrados
   - Networks (implicit default)
   - Ports
   - Environment vars desde `.env`

2. **`.env.example`** (crear)
   - Template con todas las variables requeridas

---

## Tareas Previas a Dockerizar

### Migración de datos: SQLite → PostgreSQL

1. Exportar datos desde SQLite: `python manage.py dumpdata > fixture.json`
2. Cambiar `DATABASES` en settings.py a Postgres
3. Importar en Postgres: `python manage.py loaddata fixture.json`
4. **O usar herramienta** tipo `pgloader` (más robusta para datos complejos)

### Generar SECRET_KEY seguro para producción

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**NO reusar el que está hardcodeado hoy** (ya quedó expuesto en git history público).

---

## Riesgos & Consideraciones

| Riesgo | Impacto | Mitiga |
|--------|---------|---------|
| **weasyprint** requiere librerías de sistema (pango, cairo, gdk-pixbuf, fonts) | Imagen backend será ~500MB+; puede fallar si faltan libs exactas | Fijar versión base (`python:3.12-slim`), probar build temprano |
| Migrar datos SQLite → Postgres con app activa | Downtime/inconsistencias durante migración | Runbook de migración, test en staging primero |
| `SECRET_KEY` ya expuesto en git | Security issue si el repo es público | Generar nuevo, rotarlo en producción, no reusar viejo |
| Volumen `media` es requerido (datos reales subidos) | Pérdida de datos si no se monta volumen | Documentar volumen obligatorio en `.env.example` |
| Estáticos Django (`static/`) necesita `collectstatic` | Assets no servirán si no corre el comando | Correr en entrypoint del backend, antes de gunicorn |
| CORS/ALLOWED_HOSTS hardcodeados a localhost | Fallará si se despliega en otra máquina/IP | Externalizar a variables de entorno *antes* de dockerizar |

---

## Verificación (al implementar)

- [ ] `docker compose build` sin errores para los 3 servicios
- [ ] `docker compose up`, todos los servicios sanos
- [ ] Backend corre migraciones, escucha en puerto 8000
- [ ] Postgres acepta conexión, base de datos creada
- [ ] Frontend/Nginx sirve el SPA en puerto 80/3000
- [ ] Proxy `/api` llega al backend sin CORS errors
- [ ] Subir un logo vía UI, confirma que sobrevive a `docker compose down && up` (volumen media)
- [ ] Generar PDF de cotización, verifica weasyprint en contenedor

---

## Timeline Estimado

- **Planning & setup**: 1-2 días (externalizar vars de entorno, generar Dockerfiles)
- **Testing localmente**: 2-3 días (debug weasyprint, migración SQLite→Postgres, CORS en producción)
- **Documentation & CI/CD** (opcional): 2-3 días (si se quiere automatizar push a Docker Hub, GitHub Actions, etc.)

---

## Próximos Pasos

1. ✅ Revertir launchd local (plan aprobado)
2. ✅ Actualizar roadmap con "Dockerización" como nueva tarea
3. ✅ Implementado y verificado end-to-end (`docker compose build && up` real, ver checklist abajo)

---

## Cómo Usarlo (Pendientes de Puesta en Marcha)

Pasos para levantar el stack completo por primera vez en una máquina nueva (casa, servidor de cliente, etc.):

- [ ] Clonar el repo en la máquina destino
- [ ] Copiar la plantilla de variables: `cp .env.example .env`
- [ ] Generar un `SECRET_KEY` real y pegarlo en `.env` (NO reusar el de desarrollo):
  ```bash
  python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
- [ ] Definir `POSTGRES_PASSWORD` en `.env` con un valor propio (no dejar el de ejemplo)
- [ ] Ajustar `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` en `.env` a la IP/dominio real donde se va a acceder (hoy vienen apuntando a `localhost`)
- [ ] Ajustar `FRONTEND_URL` en `.env` igual, si aplica (se usa para construir links, p.ej. aceptar invitación)
- [ ] Construir las imágenes: `docker compose build`
- [ ] Levantar los contenedores: `docker compose up -d`
- [ ] Verificar que los 3 servicios están sanos: `docker compose ps`
- [ ] Revisar logs del backend por si hay errores de migración: `docker compose logs backend --tail 50`
- [ ] Abrir el navegador en la IP/puerto configurado (`HTTP_PORT` en `.env`, default `80`) y crear la primera organización/usuario admin desde el onboarding
- [ ] **Migrar datos existentes** si se viene de la instalación local en SQLite (ver sección "Migración de datos" arriba — no se hizo todavía, no es automático)
- [ ] Configurar backups periódicos del volumen `postgres_data` (no hay nada automatizado hoy)
- [ ] Si se expone a internet (no solo red local): poner HTTPS/TLS delante (ej. Caddy o Traefik como reverse proxy adicional, o Cloudflare Tunnel) — hoy el stack sirve HTTP plano

### Comandos útiles del día a día

```bash
docker compose up -d              # levantar en background
docker compose down               # bajar (conserva volúmenes/datos)
docker compose down -v            # bajar y BORRAR datos (¡cuidado!)
docker compose logs -f backend    # seguir logs del backend en vivo
docker compose exec backend python manage.py createsuperuser
docker compose exec db psql -U aztools -d aztools   # entrar a la base de datos
docker compose build --no-cache   # reconstruir imágenes desde cero tras cambios de dependencias
```
