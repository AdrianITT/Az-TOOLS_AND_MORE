# Pruebas de Flujo Completo — Recibos con múltiples servicios

Fecha: 2026-10-02
Entorno: backend Django con SQLite (copia de la BD local, **nunca la BD de producción ni los contenedores Docker**) en `127.0.0.1:8000`; frontend Vite dev en `127.0.0.1:5177`; navegador real (Chromium + Playwright). No se hizo deploy.

## Requerimientos

1. Mostrar los atributos de los servicios seleccionados en el recibo.
2. Permitir agregar más de un servicio al recibo.
3. El monto total muestra la suma de los servicios agregados (solo los ya registrados, con precio), con el mensaje "Monto total de servicios registrados"; el monto total sigue siendo editable.
4. Fecha opcional de realización de los servicios: una por servicio o una para todos.
5. Fecha de creación editable; por defecto hoy; si el usuario la edita se conserva.

## Cambios

**Backend (`finanzas_app`)**
- Nuevo modelo `ReciboItem` (servicio FK opcional, nombre, cantidad, precio_unitario nullable, fecha_servicio nullable, `atributos` JSON). `atributos` es un *snapshot* `[{nombre, valor}]` del catálogo al agregar el servicio: el recibo no cambia si luego se edita el servicio.
- `Recibo`: se eliminan `producto`, `producto_nombre`, `cantidad` (pasan a ítems); `fecha_creacion` pasa de `auto_now_add` a `default=date.today` (editable); nuevo `fecha_servicios` (fecha general opcional); propiedad `total_servicios` (suma de ítems con precio).
- Migración `0007_recibo_items`: **migra los datos**: cada recibo existente se convierte en un recibo con 1 ítem (mismo producto, cantidad y precio = total/cantidad). Verificado sobre una copia con un recibo legacy.
- `ReciboSerializer` con `items` anidados (se reemplazan completos en PATCH), `total_servicios` de solo lectura; si no llega `monto_total` se usa la suma; valida: al menos 1 servicio, cantidad > 0, precio ≥ 0, servicio de la misma organización, atributos con formato válido, pagado ≤ total. Escritura atómica.
- PDF: tabla con una fila por servicio (atributos, fecha del servicio —propia o la general—, cantidad, valor unitario, subtotal) y fila "Servicios registrados" cuando difiere del total.

**Frontend (`pages/Recibos`)**
- `ReciboForm.jsx`: lista dinámica de servicios (agregar/quitar); al elegir uno del catálogo se prellenan nombre, precio y atributos (visibles en el recibo); mensaje "Monto total de servicios registrados"; monto total auto-calculado hasta que el usuario lo edita (queda como "Editado manualmente", con botón "Restablecer a la suma de servicios"); selector de fecha de servicios (sin fecha / una para todos / una por servicio); fecha de creación editable con hoy (hora local) por defecto.
- `Recibos.jsx`: columna "Servicios" con todos los nombres; fecha formateada sin desfase de zona horaria (`new Date('YYYY-MM-DD')` interpreta UTC y puede mostrar el día anterior).

## Resultados

Siguiendo la regla de `e2e-payload-frontend-exacto`, la suite API usa el **payload exacto que arma el formulario** (strings numéricos, `null`, `atributos` del catálogo), y se verificó además capturando el request real de la UI.

| Suite | Resultado |
|---|---|
| API E2E (`POST/GET/PATCH/DELETE`, PDF, multi-tenant, permisos, validaciones) | 42/42 |
| UI E2E en navegador (crear, editar, quitar servicio, fechas, total manual, PDF, validación) | 30/30 |
| Migración de datos legacy (recibo con producto/cantidad → 1 ítem) | OK |

Cubre, entre otros: 2 servicios suman 380.50; servicio libre sin precio no suma; total editado se respeta y no se pisa al cambiar servicios; fecha de creación omitida → hoy, editada → se conserva en PATCH; fecha por servicio y general; snapshot de atributos inmune a cambios del catálogo; servicio de otra organización → 400; otra org no ve/edita (404); visualizador no crea (403); PDF muestra servicios, atributos y fechas.

## Hallazgos durante las pruebas

- Dos "fallos" del primer pase de UI fueron del test (el catálogo había sido modificado por la prueba API previa; el `required` nativo del monto total bloquea antes que la validación JS). Ajustados; no hubo cambios de código.
- `GET /api/organizacion/` devuelve 403 en la consola para el usuario de prueba: preexistente y ajeno a Recibos.
- `manage.py test`: 3 fallas **preexistentes** (verificadas con `git stash`, idénticas sin estos cambios): 2 en `finanzas_app.tests_ocr` (dependen de la fecha actual) y 1 en `qr_app.tests` (`create_user` sin `username`).

## Deploy

Pendiente: **no se subió a producción**. Al desplegar se debe elegir explícitamente (regla de CLAUDE.md) entre preservar la BD (`build` + `restart`, sin `down -v`; la migración 0007 convierte los recibos existentes) o fresh start.
