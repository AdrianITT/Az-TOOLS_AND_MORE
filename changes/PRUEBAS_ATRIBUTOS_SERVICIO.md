# Pruebas de Flujo Completo — Guardar valor de atributo nuevo en Servicios

Fecha: 2026-07-04
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177`. Pruebas de UI con navegador real (Chromium) automatizado con Playwright, igual que en `PRUEBAS_DUPLICAR_COTIZACION.md`.

## Reporte original del usuario

> "Hay un detalle en servicio y sus atributos, pues si yo quiero editar uno y agregar un atributo nuevo, al guardarse, y digamos que es texto y escribo el texto no se guarda ni da la opción."

## Reproducción

1. Login como usuario de prueba, ir a **Servicios** → **Editar** un servicio existente.
2. **Gestionar atributos** de la categoría → crear un atributo nuevo tipo **Texto** (ej. `TallaPrueba`) → se agrega correctamente a la tabla y aparece un campo nuevo en "Valores para {categoría}" (esta parte ya funcionaba bien).
3. Escribir un texto en ese campo nuevo (ej. `Rojo intenso`).
4. **Bug reproducido**: el botón **Guardar** del formulario del servicio permanece deshabilitado — no hay forma de enviar el cambio.

## Causa raíz

En `frontend/src/pages/Servicios/ServicioForm.jsx`, el botón Guardar se deshabilita en modo edición según:

```js
disabled={submitting || (isEditing && !isDirty)}
```

Y `isDirty` se calculaba **solo** contra el estado `form` (nombre, categoría, precio_base, descripción):

```js
const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)
```

Los valores de atributos dinámicos viven en un estado aparte, `valoresForm`, que nunca entraba en esta comparación. Si el usuario únicamente cambiaba el valor de un atributo (sin tocar nombre/categoría/precio/descripción), `isDirty` seguía siendo `false` y el botón quedaba deshabilitado de forma indefinida — el usuario literalmente no tenía forma de guardar ese cambio desde la UI.

Este bug es puramente de frontend: el backend (`ServicioSerializer.update()` en `backend/cotizador_project/serializers.py`) ya soportaba correctamente actualizar `valores` vía `PATCH /api/servicios/{id}/` (borra los valores existentes y recrea los enviados) — nunca se llegó a probar porque la UI no permitía enviar la petición.

## Resolución aplicada

En `ServicioForm.jsx`:
- Se agregó el estado `initialValoresForm`, poblado junto con `initialForm` al cargar el servicio a editar.
- Se amplió `isDirty` para considerar también cambios en `valoresForm`:

```js
const isDirty =
  JSON.stringify(form) !== JSON.stringify(initialForm) ||
  JSON.stringify(valoresForm) !== JSON.stringify(initialValoresForm)
```

No se tocó el backend (no lo necesitaba).

## Verificación end-to-end (antes y después del fix)

Entorno de prueba aislado (no producción): SQLite local, organización/usuario/servicio de prueba, sin `DATABASE_URL` (confirmado antes de correr nada).

| Paso | Antes del fix | Después del fix |
|---|---|---|
| Crear atributo nuevo tipo texto en la categoría | OK (sin cambios) | OK |
| El campo del nuevo atributo aparece en "Valores para {categoría}" | OK (sin cambios) | OK |
| Escribir un valor en ese campo | El botón Guardar queda `disabled` | El botón Guardar se habilita |
| Click en Guardar | No aplica (botón deshabilitado) | `PATCH /api/servicios/{id}/` exitoso, navega al listado |
| Reabrir el servicio | No aplica | El valor escrito (`"Rojo intenso"`) aparece precargado en el campo |
| Verificación directa vía API (`GET /api/servicios/{id}/`) | No aplica | `"valores": [{"atributo": 1, "valor": "Rojo intenso"}]` — confirmado |
| Errores en consola del navegador | — | Ninguno |

## Nota sobre un error 500 visto durante la reproducción (no es el bug reportado)

Durante una corrida de prueba apareció un `500` en `POST /api/atributos-plantilla/` con `IntegrityError: UNIQUE constraint failed`. Causa: se intentó crear dos veces un atributo con el mismo nombre en la misma categoría/organización (residuo de una corrida de prueba anterior en la misma base SQLite de test), lo cual viola la constraint única esperada (`unique_plantilla_attr_por_categoria`). No es un bug — es el comportamiento correcto ante un nombre duplicado, solo que el mensaje de error que llega al usuario en ese caso podría mejorarse (actualmente se ve como error genérico de "no se pudo crear el atributo" en vez de aclarar que el nombre ya existe en esa categoría). Se deja como nota menor, no como bug bloqueante.

## Limpieza

Los procesos de prueba (`manage.py runserver`, `npm run dev`) corrieron contra `backend/db.sqlite3` local, no contra el Postgres de producción (`docker-compose.yml`). `backend/.env` (copia temporal del `.env` de la raíz, ignorado por git) y `backend/db.sqlite3` se eliminan al finalizar.
