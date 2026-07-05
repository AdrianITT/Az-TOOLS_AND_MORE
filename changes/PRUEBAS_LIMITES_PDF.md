# Pruebas de Flujo Completo — Límites de tamaño en herramientas de PDF (secciones 3 y 6 de `ListUpdata.MD`)

Fecha: 2026-07-05
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local. Pruebas de API con `curl`, usando PDFs reales generados con PyMuPDF (imágenes de ruido aleatorio para inflar el tamaño de forma realista, no archivos vacíos rellenados).

## Causa raíz (confirmada en el relevamiento inicial)

Ningún límite de tamaño de subida estaba configurado explícitamente en la infraestructura:
- `backend/tools_and_more/settings.py` no definía `DATA_UPLOAD_MAX_MEMORY_SIZE` ni `FILE_UPLOAD_MAX_MEMORY_SIZE` → Django caía en su default de 2.5 MB.
- `frontend/nginx.conf` no definía `client_max_body_size` → Nginx caía en su default de 1 MB, rechazando la petición **antes** de que llegara al backend.
- `backend/entrypoint.sh` lanzaba gunicorn sin `--timeout` explícito (default 30s), insuficiente para comprimir/unir PDFs grandes.

## Descubrimiento durante la implementación

`pdf_tools_app/serializers.py` **ya tenía** un límite de aplicación de `MAX_FILE_SIZE_MB = 25` por archivo individual (con mensaje de error claro) y `MAX_FILES = 30` archivos por petición — esto no estaba documentado en el relevamiento inicial de `ListUpdata.MD`. Esto cambia el diseño de la solución: el límite de infraestructura (Django + Nginx) debe ser **mayor** al límite de aplicación por archivo, para que:
1. Peticiones con archivos individuales dentro del límite de negocio (≤25MB) lleguen a Django sin ser cortadas por la infraestructura.
2. Operaciones con varios archivos a la vez (unir PDFs) tengan margen suficiente para que la suma total no choque contra el límite de infraestructura antes de que la validación de aplicación (por archivo) pueda correr.

## Cambios aplicados

- `backend/tools_and_more/settings.py`: nueva variable de entorno `MAX_UPLOAD_SIZE_MB` (default **150**), usada para `DATA_UPLOAD_MAX_MEMORY_SIZE` y `FILE_UPLOAD_MAX_MEMORY_SIZE`.
- `.env` / `.env.example`: documentada la nueva variable `MAX_UPLOAD_SIZE_MB=150`.
- `frontend/nginx.conf`: `client_max_body_size 150M;` a nivel `server` (cubre `/api/`), más `proxy_read_timeout`/`proxy_send_timeout 120s` en el location `/api/` para operaciones lentas (comprimir/unir archivos grandes).
- `backend/entrypoint.sh`: `--timeout "${GUNICORN_TIMEOUT:-120}"` en el comando de gunicorn (antes usaba el default de 30s).

## Por qué 150MB y no 50MB

Se probó primero con 50MB, pero dado el límite de aplicación de 25MB por archivo y hasta 30 archivos por petición (relevante para "Unir PDFs"), 50MB solo permitía ~2 archivos al tope del límite de negocio antes de chocar con la infraestructura. 150MB da margen razonable para unir varios PDFs medianos (ej. 5-6 archivos de 25MB, o muchos más de tamaño típico real de 1-5MB) sin acercarse a los extremos teóricos (30 × 25MB = 750MB, que sería excesivo permitir por defecto).

## Pruebas realizadas (`curl` directo contra el backend)

| Caso | Antes del fix (esperado) | Después del fix |
|---|---|---|
| `POST /api/pdf/protect/` con PDF real de ~10MB | `413` (roto, según reporte original) | `200` — PDF protegido devuelto correctamente |
| `POST /api/pdf/merge/` con 2 PDFs de ~10MB c/u (~20MB total) | `413` (roto, según reporte original) | `200` — PDF combinado (~20.6MB) devuelto correctamente |
| `POST /api/pdf/protect/` con PDF de ~30MB (supera el límite de aplicación de 25MB, pero está dentro del límite de infraestructura de 150MB) | — | `400` con mensaje claro: `"mid_test.pdf" supera el tamaño máximo de 25MB.` — confirma que la validación de negocio sigue aplicando correctamente y no queda enmascarada por un 413 |
| `POST /api/pdf/protect/` con PDF de ~59MB (supera el límite de aplicación de 25MB) | — | `400` con el mismo mensaje claro (no `413`) — la infraestructura ahora deja pasar la petición para que la aplicación pueda dar un mensaje útil |
| Envío sin archivo (nombre de campo incorrecto) | — | `400` con mensaje de validación de DRF, sin cambios (no relacionado con el fix) |

Adicionalmente:
- Sintaxis de `nginx.conf` validada con un contenedor `nginx:alpine` desechable (`nginx -t`), sustituyendo temporalmente el upstream `backend` (solo resoluble dentro de la red de `docker-compose`) por `127.0.0.1` para el test de sintaxis puro.
- Sintaxis de `entrypoint.sh` validada con `bash -n`.

## Limitaciones de esta verificación

Las pruebas de `curl` se corrieron contra `manage.py runserver` directo (sin Nginx ni gunicorn de por medio), ya que reproducir el stack completo (Nginx + gunicorn + Postgres) sin afectar el entorno de producción real requeriría levantar una segunda instancia de Docker Compose. Esto confirma que:
- El fix de Django (`DATA_UPLOAD_MAX_MEMORY_SIZE`/`FILE_UPLOAD_MAX_MEMORY_SIZE`) funciona.
- La configuración de `nginx.conf` es sintácticamente válida.
- `entrypoint.sh` es sintácticamente válido.

Lo que **no** se pudo verificar en este entorno: el comportamiento end-to-end real a través de Nginx con el límite de 150MB aplicado (requiere reconstruir el contenedor `frontend` en producción). Se recomienda, tras desplegar, subir un PDF de ~10-20MB desde la UI real de "Proteger PDF" y "Unir PDFs" para confirmar visualmente que ya no aparece el error 413 reportado originalmente.

## Limpieza

Los PDFs de prueba (~10MB, ~20MB, ~30MB, ~59MB) se generaron con PyMuPDF en el directorio de scratchpad de la sesión, no en el repositorio. `backend/.env` (copia temporal del `.env` de la raíz) y `backend/db.sqlite3` se eliminaron al finalizar; no se tocó el Postgres de producción.
