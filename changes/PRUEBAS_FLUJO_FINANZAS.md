# Pruebas de flujo completo — Finanzas (Ingresos, Gastos y Deudas)

**Fecha:** 2026-07-07
**Entorno:** despliegue de producción en CasaOS (`docker compose`, `http://localhost:8080` a través del proxy nginx)
**Método:** suite E2E por API (43 verificaciones) que registra movimientos reales en una organización de prueba, ejercita todos los verbos HTTP (GET, POST, PUT, PATCH, DELETE) y verifica la consistencia cruzada con el dashboard. La organización de prueba y todos sus datos se eliminaron al terminar.

## Resultado final

**43 de 43 pruebas pasaron** (tras corregir los errores documentados abajo).

## Cobertura

### Setup y seguridad
- Registro de organización nueva + login por token.
- La API rechaza peticiones sin token (401).

### Categorías de ingresos (CRUD completo)
- POST crea, GET lista, PATCH cambia color, PUT renombra.
- Rechaza nombre duplicado dentro de la misma organización (400).
- Categoría con movimientos rechaza el borrado (PROTECT).

### Ingresos (movimientos registrados)
- 3 ingresos registrados: $1,500.00 + $2,350.50 + $800.00.
- GET detalle individual, PATCH de monto ($800 → $950), PUT de reemplazo completo ($2,350.50 → $2,400), DELETE de un cuarto ingreso temporal.
- Total resultante verificado: **$4,850.00**.

### Gastos (movimientos registrados)
- 3 gastos registrados: $600.00 (renta) + $150.75 (servicios) + $1,200.00 (mercancía a crédito).
- PATCH de monto ($150.75 → $175.00), DELETE de un gasto temporal.
- Total resultante verificado: **$1,975.00**.
- Filtro `?categoria=` devuelve solo los gastos de esa categoría.

### Deudas (flujo completo con movimientos vinculados)
- Las 9 categorías default se siembran al registrar la organización.
- Deuda de proveedor (cuenta por pagar, $1,200) y tarjeta revolvente ($8,000) creadas; PATCH de acreedor.
- El gasto de mercancía a crédito aparece en `?sin_pago_deuda=true`, se vincula al pago que liquida la deuda del proveedor, y la deuda pasa automáticamente a `estado='pagada'`.
- Pago de tarjeta sin gastos vinculados baja el saldo a $6,000; historial de pagos correcto.
- Resumen de deudas: $6,000 (solo la tarjeta activa; la liquidada no aparece).

### Dashboard (consistencia con los movimientos registrados)
- Mes actual: ingresos $4,850.00, gastos $1,975.00, ganancia $2,875.00 — cuadran exacto con los movimientos tras el CRUD.
- Detalle del mes: 3 ingresos + 3 gastos.
- Resumen por categoría (ingresos): Ventas $3,900.00; porcentajes suman 100%.
- Resumen por categoría (gastos): Proveedores $1,200.00; `?tipo=invalido` rechazado (400).
- Gastos por día: 3 días, el mayor $1,200.00.

### Frontend
- nginx sirve la SPA (200) y la ruta `/finanzas` responde vía fallback a index.

## Errores encontrados, causas y soluciones

### 1. Categoría duplicada devolvía error 500 (crash) en vez de 400

- **Síntoma:** `POST /api/finanzas/categorias-ingresos/` con un nombre ya existente en la organización devolvía **500 Internal Server Error** sin mensaje. En el frontend el usuario vería "No se pudo crear la categoría" sin saber por qué.
- **Causa:** los tres modelos de categoría (`CategoriaIngreso`, `CategoriaGasto`, `CategoriaDeuda`) tienen `UniqueConstraint(organization, nombre)`, pero `organization` no forma parte del serializer (se asigna en `perform_create` desde el usuario autenticado). DRF no puede inferir el validador de unicidad, así que la violación explotaba como `IntegrityError` a nivel de PostgreSQL.
- **Solución:** nuevo mixin `_CategoriaUniquePorOrgMixin` en `finanzas_app/serializers.py` con un `validate_nombre` que consulta por `organization + nombre` (excluyendo la propia instancia en updates) y devuelve **400 con el mensaje "Ya existe una categoría con ese nombre."**. Aplicado a los tres serializers de categoría.
- **Verificado:** los tres endpoints (ingresos, gastos, deudas) ahora responden 400 ante duplicados.

### 2. Advertencia de migración pendiente en cada arranque del backend

- **Síntoma:** en cada `docker compose up`, el log del backend mostraba `Your models in app(s): 'finanzas_app' have changes that are not yet reflected in a migration`.
- **Causa:** la migración `0002_add_deudas` se escribió a mano con nombres de índice personalizados (`finanzas_ap_organiza_deuda_idx`, etc.), pero los modelos declaraban los índices sin `name=`, así que Django generaba nombres automáticos distintos y detectaba un "rename" pendiente.
- **Solución:** se declararon los nombres explícitos en el `Meta` de `CategoriaDeuda` y `Deuda` en `finanzas_app/models.py`, igualando los de la migración. `makemigrations --check` ahora reporta "No changes detected".

### 3. (Sesión previa, mismo ciclo de pruebas) Cuenta por pagar liquidada quedaba "activa"

- **Síntoma:** una deuda de tipo `cuenta_por_pagar` pagada al 100% seguía en estado `activa` con saldo $0 y aparecía en resumen y próximos vencimientos.
- **Causa:** el auto-cierre a `estado='pagada'` solo aplicaba a `cuotas_fijas`.
- **Solución:** en `DeudaViewSet.pagos` (`finanzas_app/views.py`) el auto-cierre aplica ahora a `cuotas_fijas` y `cuenta_por_pagar` (revolvente se excluye a propósito: su saldo fluctúa). Además `resumen` y `proximos-vencimientos` filtran `saldo_actual > 0` como defensa.

### 4. (Reportado por el usuario tras las pruebas) "Este campo es requerido" al registrar una deuda desde el frontend

- **Síntoma:** en la pestaña Deudas, con todos los campos del formulario llenos, al enviar aparecía "Este campo es requerido" y la deuda no se registraba.
- **Causa:** el serializer (`DeudaSerializer`) exigía `saldo_actual`, pero el formulario del frontend no lo envía — por diseño, una deuda recién registrada empieza debiendo su monto original, así que no tiene sentido pedirlo dos veces. La suite E2E no lo detectó porque enviaba `saldo_actual` explícitamente en cada POST (payload distinto al del frontend real).
- **Solución:** `saldo_actual` es ahora opcional en el serializer (`extra_kwargs`); al crear sin él, `validate()` lo iguala a `monto_original`. Si se envía explícito (p. ej. migrar una deuda ya parcialmente pagada), se respeta.
- **Verificado contra el despliegue:** POST sin `saldo_actual` → 201 con saldo = monto original; POST con saldo explícito ($3,200 de $5,000) → se respeta; un pago posterior sobre la deuda creada descuenta bien ($5,000 → $4,000).
- **Lección para futuras suites:** probar también el payload exacto que envía el frontend, no solo el payload "completo" ideal.

## Incidencias no funcionales durante las pruebas

- Dos corridas iniciales fallaron con **502 Bad Gateway**: el backend tarda ~30-60 s en arrancar (wait_for_db → migraciones → collectstatic → gunicorn) tras un `docker compose up`/reinicio del host. No es un bug — solo hay que esperar a que gunicorn esté arriba. El script ahora espera a que `/api/` responda 401 antes de correr.

## Script

`test_finanzas_full.py` — crea una organización desechable, ejecuta las 43 verificaciones y termina con exit code 0/1. Los datos de prueba se limpian con un `manage.py shell` posterior (deudas → gastos/ingresos → organización, en ese orden por las FK `PROTECT`).
