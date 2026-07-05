# Pruebas de Flujo Completo — Duplicar Cotización (sección 9 de `ListUpdata.MD`)

Fecha: 2026-07-04
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177` (proxy `/api` → backend). Pruebas de API vía `curl` y pruebas de UI vía navegador real (Chromium) automatizado con Playwright.

## Metodología

- Se creó un entorno de prueba aislado (no Docker/Postgres): `backend/.env` copiado del `.env` de la raíz (ignorado por git) y venv local con las dependencias de `requirements.txt`, migraciones aplicadas contra SQLite.
- Datos de prueba: 2 organizaciones, usuario `tester1` (rol admin, Org Test 1), usuario `tester2` (rol admin, Org Test 2), usuario `tester_visualizador` (rol visualizador, sin permiso `crear`), un cliente, dos servicios con categoría y un atributo dinámico (`Color`), una cotización con 2 items y valores de atributo (`COT-TEST-0001`, total $928.00) y una cotización sin items (`COT-TEST-0002`).
- Se probó `POST /api/cotizaciones/{id}/duplicar/` directamente con `curl` (caso feliz, sin items, cross-organización, sin autenticar, permisos insuficientes).
- Se probó el flujo real de UI con un navegador Chromium (Playwright): login, listado de Cotizaciones, clic en el botón **Duplicar**, verificación de que la navegación cae en el detalle de la copia con los datos correctos, sin errores en la consola del navegador.

## Resultado general

**No se encontraron bugs en la funcionalidad de "Duplicar cotización" en sí.** Todos los casos de API y el flujo de UI se comportaron como se especificó en `ListUpdata.MD` sección 9. Se encontraron y resolvieron 3 problemas, todos del entorno de pruebas (no del código de producción).

## Casos probados — API (`curl`)

| Caso | Resultado | Detalle |
|---|---|---|
| Duplicar cotización con items y atributos (usuario dueño, permiso OK) | `201` | Nuevo `id`, nuevo `numero` autogenerado (`COT-20260705-0001`), `estado: "borrador"` (aunque la original ya estaba en borrador), mismos `cliente`, `descripcion`, `iva_porcentaje`, `subtotal`/`impuesto`/`total` recalculados iguales, ambos items copiados con nuevos `id` y sus `valores` (atributo `Color`) preservados |
| Verificar que la original no cambió tras duplicar | OK | `GET` de la original antes y después del duplicado devuelve el mismo `actualizado` (timestamp sin cambios) y los mismos `items`/`valores` con sus `id` originales intactos |
| Duplicar cotización sin items | `201` | Copia creada con `items: []`, `subtotal/impuesto/total = 0.00` |
| Duplicar cotización de otra organización (usuario de Org 2 sobre cotización de Org 1) | `404` | `OrganizationFilterMixin` la excluye del queryset del otro usuario — no filtra información de existencia (no revela 403 vs 404) |
| Duplicar sin token | `401` | `{"detail":"Las credenciales de autenticación no se proveyeron."}` |
| Duplicar con usuario sin permiso `crear` (rol `visualizador`) | `403` | `{"detail":"Usted no tiene permiso para realizar esta acción."}` — el mapeo `permiso_por_accion = {'duplicar': 'crear'}` agregado en `CotizacionViewSet` funciona correctamente |

## Casos probados — UI (Playwright + Chromium real)

1. Login como `tester1` → redirige correctamente fuera de `/login`.
2. `/cotizaciones` muestra la tabla con el botón **Duplicar** junto a "Ver / Editar" y "Eliminar" en cada fila.
3. Clic en **Duplicar** → llamada a `POST /cotizaciones/{id}/duplicar/` → navegación automática a `/cotizaciones/{nuevoId}`.
4. El formulario de la copia carga pre-poblado: cliente, fecha de vencimiento, IVA, descripción, estado "Borrador", y — para la cotización con items — ambos servicios (`Servicio A` x3 @ $100, `Servicio B` x2 @ $250) con subtotal/IVA/total idénticos a la original ($800 / $128 / $928).
5. El formulario **no se autoguarda**: aparece como cualquier cotización editable con botón "Guardar cambios", cumpliendo el requerimiento de "permitir modificar cualquier dato antes de guardarla".
6. Sin errores en la consola del navegador durante todo el flujo (login → listado → duplicar → detalle).

## Problemas encontrados durante la preparación del entorno (no son bugs de la feature)

### 1. Vite 8 no arrancaba con Node.js del sistema (18.19.1)

- **Síntoma**: `npm run dev` fallaba con `ReferenceError: CustomEvent is not defined` / `Vite requires Node.js version 20.19+ or 22.12+`.
- **Causa**: el proyecto usa Vite `^8.1.1`, que requiere Node 20.19+ o 22.12+; el entorno solo tenía Node 18.19.1 instalado vía `apt`.
- **Resolución**: se instaló `nvm` en el `$HOME` del usuario (no toca el Node del sistema) y Node 20.20.2 vía `nvm install 20`, con autorización explícita del usuario. El Node del sistema (`/usr/bin/node`) no se modificó.

### 2. `node_modules` con binario nativo de Rolldown faltante

- **Síntoma**: tras cambiar a Node 20, Vite fallaba con `Cannot find module '@rolldown/binding-linux-x64-gnu'`.
- **Causa**: `node_modules` había sido instalado originalmente bajo Node 18, sin el binding nativo opcional correcto para esta plataforma.
- **Resolución**: `npm install` de nuevo ya bajo Node 20 en `frontend/`, lo que descargó el binding correcto (`node_modules/@rolldown/binding-linux-x64-gnu`).

### 3. Usuario de prueba sin flags de permiso → `403` en `/api/organizacion/` (no relacionado con duplicar)

- **Síntoma**: la primera corrida del test de UI mostró 3 errores `403` en consola al cargar cualquier página.
- **Causa**: `tester1` se creó directo por ORM (`User.objects.get_or_create(...)`) sin pasar por el flujo real de alta (invitación/registro), que es el que asigna los flags `puede_gestionar_usuarios`, etc. según `FLAGS_POR_DEFECTO_POR_ROL`. Con el flag en `False` por defecto, `GET /api/organizacion/` (llamado globalmente en `App.jsx:49` para aplicar el tema/logo de la organización) devolvía 403.
- **Resolución**: se ajustaron manualmente los flags del usuario de prueba. **No se tocó código de producción** — es exclusivamente un artefacto de cómo se generaron los datos de prueba, no un bug real (el flujo normal de alta de usuarios sí asigna estos flags correctamente).

## Limpieza

Los procesos de `manage.py runserver` y `npm run dev` levantados para esta prueba corren en segundo plano sobre datos aislados (SQLite local en `backend/db.sqlite3`, no la base de producción/Postgres de `docker-compose.yml`). El archivo `backend/.env` creado para esta prueba está ignorado por git y puede eliminarse sin afectar el proyecto.
