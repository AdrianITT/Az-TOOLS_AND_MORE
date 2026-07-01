# Pruebas de Flujo Completo — API + Frontend

Fecha: 2026-07-01 (primera corrida) / 2026-07-01 (fixes aplicados y re-verificados) / 2026-07-01 (segunda corrida: atributos dinámicos + items de cotización)
Entorno: backend Django en `http://127.0.0.1:8000`, frontend Vite en `http://localhost:5173` (proxy `/api` → backend).

## Metodología

- Cada endpoint de la API se probó con `curl` directo contra el backend y a través del proxy de Vite (`localhost:5173/api/...`), usando un usuario de prueba (`qa_admin`, rol admin, organización `Prueba1` id=2) y un usuario de rol limitado (`qa_vendedor`) para validar permisos.
- Se probaron los métodos GET, POST, PUT, PATCH, DELETE de cada recurso, casos de error (datos inválidos, sin token, token inválido, permisos insuficientes) y efectos secundarios (recálculo de totales, contadores de reportes).
- **Limitación importante**: este entorno no tiene una herramienta de navegador/Playwright disponible, así que el frontend no se probó haciendo clics reales en la UI. En su lugar se verificó el flujo real siguiendo el código de cada pantalla (`AuthContext`, `ProtectedRoute`, páginas) y confirmando contra el backend real qué respuesta recibe cada llamada que el código dispara.
- Todos los registros y usuarios de prueba creados durante ambas corridas fueron borrados al finalizar, con autorización explícita del usuario en cada caso.

## Resumen de resultados (tras los fixes)

| Recurso | GET list | GET detail | POST | PUT | PATCH | DELETE | Estado |
|---|---|---|---|---|---|---|---|
| Clientes | OK | OK | OK | OK | OK | OK | Correcto |
| Servicios | OK | OK | OK | — | OK | OK | Correcto |
| Cotizaciones (list/create) | OK | — | OK | — | — | — | Correcto — **Bug #4 arreglado** (migración aplicada por el usuario) |
| Cambiar estado cotización | — | — | OK | — | — | — | **Bug #1 — arreglado** |
| Usuarios | OK | — | N/A (por diseño) | — | — | N/A | Correcto |
| Invitaciones | OK | — | OK | — | — | — | Correcto |
| Cancelar invitación | — | — | OK | — | — | — | Correcto |
| Aceptar invitación | — | — | OK | — | — | — | Correcto (token de un solo uso validado) |
| Reportes/resumen | OK | — | — | — | — | — | Correcto (re-verificado tras el fix de migración) |
| Auth login | — | — | OK | — | — | — | Correcto |
| Auth me (`/api/auth/me/`) | OK | — | — | — | — | — | **Bug #2 — arreglado** |
| Registro de organización (`/api/organizaciones/registro/`) | — | — | OK | — | — | — | **Bug #3 — arreglado** |
| Permisos (401/403) | OK | — | — | — | — | — | Correcto |

---

## Bugs de la primera corrida — arreglados y re-verificados

### Bug #1 — `cambiar_estado` aceptaba cualquier valor sin validar → **RESUELTO**

- **Dónde**: `backend/cotizador_project/views.py`, método `CotizacionViewSet.cambiar_estado`.
- **Causa raíz**: la vista tomaba `request.data.get('estado')` y lo guardaba directamente sin validar contra `Cotizacion.ESTADO_CHOICES`.
- **Efecto que causaba**: un estado inválido (ej. `"no_existe"`) se guardaba con `HTTP 200`, y la cotización desaparecía silenciosamente de todos los contadores de `GET /api/reportes/resumen/`.
- **Solución aplicada**: se agregó una validación explícita contra `dict(Cotizacion.ESTADO_CHOICES)` antes de guardar; si el valor no es válido, se lanza `ValidationError` (`HTTP 400`) con un mensaje que lista las opciones permitidas.
- **Verificación**: `POST /api/cotizaciones/{id}/cambiar_estado/ {"estado":"no_existe"}` ahora responde `400` con `{"estado": "\"no_existe\" no es un estado válido. Opciones: borrador, enviada, aceptada, rechazada, expirada."}`. Con un valor válido (`"enviada"`), el estado se guarda correctamente (verificado leyendo el objeto desde el ORM, ver Bug #4 sobre por qué la respuesta HTTP de este caso puntual no se pudo confirmar).

### Bug #2 — `GET /api/auth/me/` no existía → sesión no persistía → **RESUELTO**

- **Dónde backend**: no había ninguna URL registrada para `auth/me/`.
- **Dónde frontend**: `frontend/src/auth/AuthContext.jsx` depende de este endpoint para poblar el usuario tras el login; al fallar con 404, borraba el token y expulsaba al usuario de vuelta al login casi de inmediato en cada login/refresh.
- **Solución aplicada**: se agregó `MeView` (`GET`, `IsAuthenticated`) en `views.py` que devuelve `UserSerializer(request.user).data`, y la ruta `path('auth/me/', views.MeView.as_view(), name='auth_me')` en `urls.py`.
- **Verificación**: `GET /api/auth/me/` con un token válido responde `200` con los datos del usuario autenticado (id, username, organization, rol, flags de permiso). El flujo de login ya no debería expulsar al usuario.

### Bug #3 — `POST /api/organizaciones/registro/` no existía → **RESUELTO**

- **Dónde frontend**: `frontend/src/pages/Onboarding/CrearOrganizacion.jsx`, ya tenía el comentario `// Pendiente en el backend`.
- **Solución aplicada**: se agregó `RegistroOrganizacionSerializer` (en `serializers.py`, simétrico a `AceptarInvitacionSerializer`) que valida nombre de organización único y username único, crea la `Organization` y el primer `User` con rol `admin` y todos los flags de permiso en `True`; y `RegistroOrganizacionView` (`POST`, `AllowAny`) en `views.py` con ruta `path('organizaciones/registro/', ...)` en `urls.py`.
- **Verificación**: `POST /api/organizaciones/registro/` con datos completos responde `201` con `{token, user}`; el usuario creado pudo loguearse inmediatamente después con `POST /api/auth/login/`.

---

## Bug nuevo encontrado durante la verificación de los fixes — RESUELTO por el usuario

### Bug #4 — `/api/cotizaciones/` (list/create) y la respuesta de `cambiar_estado` fallaban con `500` por una migración pendiente

- **Qué pasaba**: al probar los fixes se detectó que el backend tenía en curso un refactor grande de modelos (`ItemCotizacion` → `CotizacionDetalle`, más un sistema de atributos dinámicos `AtributoPlantilla`/`ServicioValor`/`CotizacionValor`) que ya estaba en el código (`models.py`, `serializers.py`, `views.py`, `urls.py`) pero sin migración aplicada: `showmigrations` solo llegaba a `0003_alter_user_organization`. La tabla `cotizador_project_cotizaciondetalle` no existía en la base SQLite.
- **Síntoma**: cualquier request que serializara una `Cotizacion` (campo anidado `items`) fallaba con `OperationalError: no such table: cotizador_project_cotizaciondetalle` → `HTTP 500`.
- **Efecto secundario detectado**: `POST /api/cotizaciones/` igual creaba el registro en la base (el `perform_create` corría antes del error) pero respondía `500` porque el error ocurría al serializar la respuesta — un usuario podía ver un error y en realidad haber creado el registro igual, sin saberlo, arriesgando duplicados en un reintento.
- **Causa raíz**: migración de Django faltante para el refactor de modelos ya presente en el código.
- **Resolución**: el usuario generó y aplicó la migración `0004_atributoplantilla_atributoplantillaopcion_and_more.py` en paralelo, mientras yo trabajaba en los otros 3 fixes. Confirmado con `showmigrations` (`[X] 0004_...`).
- **Re-verificación tras el fix**: `POST /api/cotizaciones/` responde `201` con `"items":[]`; `GET /api/cotizaciones/` responde `200`; `cambiar_estado` con estado inválido sigue devolviendo `400` (Bug #1) y con estado válido devuelve `200` con el objeto completo serializado (ya no 500); `GET /api/reportes/resumen/` calcula bien `total_cotizaciones`, `por_estado` y `total_facturado` para el estado `aceptada`.

---

## Cosas verificadas que funcionan correctamente

- Autenticación por token: login válido (200), credenciales incorrectas, token inválido (401 "Token inválido"), sin token (401 "Las credenciales de autenticación no se proveyeron").
- Permisos por rol: usuario `vendedor` sin `puede_gestionar_usuarios` recibe 403 en `/usuarios/` y `/reportes/resumen/`; puede crear clientes pero no eliminarlos (403 en DELETE), acorde a la matriz de permisos del backend.
- CRUD completo de Clientes y Servicios (GET/POST/PUT/PATCH/DELETE), con filtrado por organización.
- Invitaciones: creación, listado, cancelación (`estado` pasa a `cancelada`).
- Aceptar invitación: crea el usuario, devuelve token válido, y **rechaza correctamente el reintento** con el mismo token ("Esta invitación ya no está vigente") — el token es de un solo uso como se espera.
- Proxy Vite → Django (`localhost:5173/api/*` → `127.0.0.1:8000/api/*`) funciona correctamente; CORS configurado para `localhost:5173`.
- `auth/me`, `organizaciones/registro` y la validación de `cambiar_estado` — ver arriba, arreglados y verificados.

## Endpoints definidos en el backend pero no usados por el frontend actualmente

Esto no son errores, solo funcionalidad expuesta sin consumidor en la UI: `GET/PUT/PATCH/DELETE /api/clientes/{id}/`, `GET/PUT/PATCH/DELETE /api/servicios/{id}/`, `GET/PUT/PATCH/DELETE /api/cotizaciones/{id}/`, todo `/api/items/`, `GET/PUT/PATCH /api/usuarios/{id}/`.

## Archivos modificados en esta sesión (backend, con pedido explícito del usuario)

- `backend/cotizador_project/views.py`: agregada validación en `cambiar_estado`; agregadas `MeView` y `RegistroOrganizacionView`.
- `backend/cotizador_project/serializers.py`: agregado `RegistroOrganizacionSerializer`.
- `backend/cotizador_project/urls.py`: agregadas rutas `auth/me/` y `organizaciones/registro/`.

## Pendiente / próximos pasos recomendados (de la primera corrida)

1. Los 4 bugs encontrados en esa sesión están resueltos y re-verificados contra la API real.
2. ~~Falta probar de punta a punta el nuevo sistema de atributos dinámicos~~ → cubierto en la segunda corrida (ver abajo).
3. Hacer una pasada visual manual del frontend (login → dashboard → clientes/servicios/cotizaciones → logout) ahora que `/auth/me/` existe, para confirmar que la persistencia de sesión ya no expulsa al usuario (no se pudo hacer en este entorno por falta de herramienta de navegador).

---

## Segunda corrida — Sistema de atributos dinámicos (EAV) + editor de items en Cotizaciones

Contexto: el backend fue rediseñado (`AtributoPlantilla`, `ServicioValor`, `CotizacionDetalle`, `CotizacionValor`) para soportar cualquier rubro de negocio con campos custom por categoría, y el frontend (`Servicios.jsx`, `Cotizaciones.jsx`, `api/client.js`) fue reescrito para consumir ese esquema. Esta corrida valida ese flujo de punta a punta contra el backend real, simulando exactamente los payloads que dispara el nuevo código del frontend.

**Metodología**: mismo enfoque que la primera corrida (sin herramienta de navegador disponible) — se probó vía `curl` contra `http://127.0.0.1:8000/api` replicando byte a byte los payloads que arma cada función `handleSubmit`/`handleAddItem` del frontend nuevo, y por separado se confirmó que el proxy de Vite (`/api/auth/me/` vía `localhost:5180`) llega correctamente al backend. Se usó una organización nueva por corrida (registro real vía `/api/organizaciones/registro/`), y se borraron todos los datos de prueba (incluyendo `ServicioValor`/`CotizacionValor`/`AtributoPlantilla` en el orden correcto por las FKs `PROTECT`) al finalizar.

### Resumen de resultados

| Paso probado | Resultado |
|---|---|
| Registro de organización | 201 OK |
| `POST /atributos-plantilla/` con `opciones` anidadas (tipo `select`) | 201 OK |
| `POST /atributos-plantilla/` tipo `number` | 201 OK |
| `GET /atributos-plantilla/?categoria=X` (filtro usado por el form dinámico) | 200 OK |
| `PATCH /atributos-plantilla/{id}/` | 200 OK |
| `POST /servicios/` con `categoria` + `valores` anidados | 201 OK, `valores` devueltos correctamente |
| `POST /servicios/` con valor de `select` fuera de las `opciones` válidas | 400 OK (rechazado como se esperaba) |
| `GET /servicios/{id}/` (valores anidados) | 200 OK |
| `PATCH /servicios/{id}/` | 200 OK |
| `POST /clientes/`, `POST /cotizaciones/` | 201 OK |
| `POST /items/` (agregar item a una cotización) | 201 OK, **prellenó automáticamente `valores` desde `ServicioValor` del catálogo** (`color`, `sabor`, etc. del servicio) |
| `GET /cotizaciones/{id}/` tras agregar item | 200 OK, `subtotal`/`impuesto`/`total` recalculados correctamente (1100 → 1276 con impuesto 16%) |
| `cambiar_estado` con estado válido | 200 OK |
| `cambiar_estado` con estado inválido | 400 OK (validación de Bug #1 de la primera corrida sigue funcionando) |
| `DELETE /items/{id}/` | 204 OK, y la cotización recalculó `total` a `0.00` |
| `DELETE /atributos-plantilla/{id}/` estando en uso (`ServicioValor` lo referencia) | **500 la primera vez — ver Bug #5** |
| `GET /reportes/resumen/`, `GET /usuarios/`, `POST /invitaciones/` | 200/201 OK |
| `GET /servicios/` sin token | 401 OK |
| Conexión proxy Vite → Django (`localhost:5180/api/auth/me/` sin token) | 401 (igual que pegándole directo al backend — proxy funciona) |
| `npm run build` del frontend tras los cambios | Compiló sin errores |
| `npx oxlint` sobre los 3 archivos modificados | Sin warnings |

### Bug #5 — `DELETE /atributos-plantilla/{id}/` en uso tiraba 500 en vez de un error controlado → **RESUELTO**

- **Dónde**: `backend/cotizador_project/views.py`, `AtributoPlantillaViewSet` (nuevo, agregado en esta misma sesión junto con el resto del esquema EAV).
- **Causa raíz**: `ServicioValor.atributo` y `CotizacionValor.atributo` usan `on_delete=models.PROTECT` hacia `AtributoPlantilla` (correcto, para no perder datos silenciosamente), pero el `ModelViewSet` no capturaba la excepción `django.db.models.ProtectedError` que Django lanza al intentar el `DELETE` — el error subía sin manejar y DRF devolvía un 500 con el traceback completo de Django expuesto.
- **Efecto que causaba**: un admin que intenta borrar un atributo ya usado en servicios/cotizaciones existentes vería una pantalla de error genérica de servidor en vez de un mensaje claro de "no se puede borrar, está en uso".
- **Solución aplicada**: se agregó `AtributoPlantillaViewSet.perform_destroy`, que envuelve `instance.delete()` en un `try/except ProtectedError` y relanza un `rest_framework.exceptions.ValidationError` con un mensaje explicativo (→ `HTTP 400` en vez de `500`).
- **Verificación**: se repitió la corrida completa desde cero (nueva organización) tras el fix — el mismo paso ahora responde `400` con `["No se puede borrar este atributo porque ya está en uso en servicios o cotizaciones."]`, y todos los demás pasos (22 en total) siguieron devolviendo los mismos códigos correctos que antes del fix.

### Cosas verificadas que funcionan correctamente (segunda corrida)

- El formulario dinámico de `Servicios.jsx` puede definir atributos custom por categoría (texto, número, decimal, booleano, color, lista) y el backend valida el tipo/obligatoriedad/opciones correctamente en ambos sentidos (acepta válidos, rechaza inválidos con 400).
- El prellenado automático de `CotizacionValor` desde `ServicioValor` al agregar un item a una cotización (lógica en `CotizacionDetalle.save()`) funciona sin intervención del frontend.
- El recálculo de `subtotal`/`impuesto`/`total` de la cotización sigue funcionando igual que antes del rediseño, tanto al agregar como al quitar items.
- El nuevo helper `getErrorMessage` en `api/client.js` (agregado en esta sesión) puede extraer mensajes de errores anidados de DRF (ej. `{valores: [{valor: ["msg"]}]}`) que el patrón viejo `err.data?.detail` no capturaba — necesario porque `ServicioSerializer`/`CotizacionDetalleSerializer` ahora devuelven errores anidados en el campo `valores`.

### Archivos modificados en esta segunda corrida

- `backend/cotizador_project/views.py`: fix del Bug #5 (`AtributoPlantillaViewSet.perform_destroy`).
- (Cambios de la reescritura del frontend en la tarea previa a esta corrida, no bugs de esta corrida: `frontend/src/api/client.js`, `frontend/src/pages/Servicios/Servicios.jsx`, `frontend/src/pages/Cotizaciones/Cotizaciones.jsx`.)

### Pendiente

- Pasada visual manual en navegador real del formulario dinámico de Servicios y del editor de items de Cotizaciones (no se pudo hacer en este entorno por falta de herramienta de navegador/Playwright) — la lógica fue validada replicando los payloads exactos que dispara el código React, pero no hubo verificación pixel-a-pixel de la UI.
- Edición de `valores` (overrides) por item de cotización quedó explícitamente fuera de alcance de esta iteración (el caso base ya funciona vía prellenado automático desde el catálogo).
