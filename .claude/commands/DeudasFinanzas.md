# Deudas en Finanzas

Agregar un tercer pilar al módulo Finanzas — junto a Ingresos y Gastos — para trackear los **pasivos** de la organización: cuánto debe, a quién, con qué condiciones, y cuándo vencen los próximos pagos. Hoy Finanzas solo muestra flujo de caja (lo que entra y sale); no hay forma de ver la deuda pendiente en ningún lado, ni de relacionar un pago de deuda con los gastos que ese pago está saldando.

## Objetivo

Que un usuario pueda responder:

- ¿Cuánto debe la organización en total, y a quién?
- ¿Qué pagos vencen esta semana / este mes?
- ¿Cuánto le queda por pagar de cada préstamo o tarjeta?
- ¿En qué categorías de deuda está concentrado el pasivo (tarjetas, préstamos, proveedores)?
- ¿Cuándo termina de pagar una deuda a cuotas fijas si sigue el ritmo actual?
- ¿Qué gasto(s) ya registrados quedaron saldados con un pago de deuda en particular?

## Tipos de deuda — análisis para las categorías

No todas las deudas se comportan igual, y esa diferencia es la que debe estructurar las categorías (no una lista arbitraria de nombres). Cada categoría lleva un campo **`tipo_amortizacion`** con 3 valores posibles. Este campo es la pieza clave de "lógica y fluidez": determina qué campos son relevantes en el formulario de alta, evitando pedirle al usuario datos que no aplican a su tipo de deuda.

| `tipo_amortizacion` | Comportamiento | Ejemplos |
|---|---|---|
| **`revolvente`** | El saldo fluctúa (sube con nuevos cargos, baja con pagos), sin fecha de fin fija, tiene un pago mínimo mensual. No aplica `fecha_vencimiento`. | Tarjeta de crédito, línea de crédito |
| **`cuotas_fijas`** | Plazo fijo, pago periódico fijo, el saldo decrece hasta llegar a cero en una fecha conocida. | Préstamo personal, hipotecario, automotriz, de negocio, entre particulares |
| **`cuenta_por_pagar`** | Normalmente sin interés, atada a una fecha de vencimiento concreta y de corto plazo; es el tipo que más se relaciona con gastos ya registrados (se compra algo a crédito, se registra el `Gasto`, y luego se paga). | Deuda con proveedores, impuestos por pagar |

### Categorías por default a sembrar

| Categoría | Ícono | `tipo_amortizacion` |
|---|---|---|
| Tarjeta de crédito | 💳 | revolvente |
| Línea de crédito | 🏦 | revolvente |
| Préstamo personal | 🤝 | cuotas_fijas |
| Préstamo hipotecario | 🏠 | cuotas_fijas |
| Préstamo automotriz | 🚗 | cuotas_fijas |
| Préstamo de negocio | 💼 | cuotas_fijas |
| Deuda con proveedores | 📦 | cuenta_por_pagar |
| Impuestos por pagar | 🧾 | cuenta_por_pagar |
| Otro | 📋 | cuotas_fijas |

Estas categorías se siembran por organización (igual que hoy no existen categorías globales de Ingreso/Gasto, cada organización tiene las suyas), agregando su creación en `RegistroOrganizacionSerializer.create()` (`backend/cotizador_project/serializers.py`), junto a donde ya se crea la organización y el primer usuario admin — así toda organización nueva las tiene desde el alta, sin necesidad de un management command aparte. El usuario puede editarlas/eliminarlas/agregar las suyas después, igual que con las categorías de Ingreso/Gasto.

## Modelo de datos propuesto

Sigue el molde exacto de `CategoriaIngreso`/`Ingreso` en `backend/finanzas_app/models.py`, con un modelo adicional para el historial de pagos que además **se relaciona con `Gasto`**.

### `CategoriaDeuda`
Igual que `CategoriaIngreso`/`CategoriaGasto`, más el campo diferenciador:
- `organization` (FK `Organization`, `CASCADE`)
- `nombre` (`CharField`)
- `color` (`CharField`, hex)
- `icono` (`CharField`, emoji default)
- `tipo_amortizacion` (`CharField` con `choices`: `revolvente` / `cuotas_fijas` / `cuenta_por_pagar`)
- `creado` (auto)
- `UniqueConstraint(organization, nombre)` + `Index(organization)`, igual que las categorías existentes.

### `Deuda`
Igual que `Ingreso`/`Gasto`, con campos adicionales propios de un pasivo:
- `organization` (FK `Organization`, `CASCADE`)
- `categoria` (FK `CategoriaDeuda`, `PROTECT` — no se puede borrar una categoría en uso)
- `acreedor` (`CharField` — nombre del banco, proveedor o persona)
- `monto_original` (`Decimal`)
- `saldo_actual` (`Decimal`)
- `tasa_interes_anual` (`Decimal`, opcional — no aplica a `cuenta_por_pagar`)
- `pago_periodico` (`Decimal`, opcional — no aplica a `cuenta_por_pagar`)
- `dia_pago` (`PositiveSmallIntegerField` 1-31, opcional)
- `fecha_inicio` (`DateField`)
- `fecha_vencimiento` (`DateField`, opcional — no aplica a `revolvente`)
- `estado` (`CharField` choices: `activa` / `pagada` / `vencida`)
- `notas` (`TextField`, opcional)
- `creado_por` (FK `User`, `SET_NULL`)
- `creado`, `actualizado` (auto)
- Índices `(organization, categoria)` y `(organization, estado)`, igual estilo que `Ingreso`/`Gasto`.

### `PagoDeuda` (nuevo) — vinculado a `Gasto`

Historial de pagos, uno por cada abono registrado. **Punto clave de este diseño**: un pago de deuda puede — opcionalmente — cubrir uno o varios `Gasto` ya existentes, para mantener la trazabilidad entre "se generó el gasto" (p. ej. una compra a proveedor a crédito) y "se saldó con este pago de deuda".

- `deuda` (FK `Deuda`, `CASCADE`)
- `fecha` (`DateField`)
- `monto` (`Decimal`)
- `saldo_resultante` (`Decimal` — snapshot del saldo tras aplicar este pago, para no tener que recalcular históricos)
- **`gastos_cubiertos`** (`ManyToManyField` a `Gasto`, `blank=True`, `related_name='pagos_deuda'`) — el o los gastos que este pago está saldando. Opcional: no todo pago de deuda tiene un gasto puntual asociado (p. ej. el pago mínimo de una tarjeta revolvente no siempre corresponde a un `Gasto` específico ya registrado), pero cuando sí existe esa relación (típicamente en `cuenta_por_pagar`), debe poder declararse explícitamente.
- `notas` (`TextField`, opcional)
- `creado_por` (FK `User`, `SET_NULL`)
- `creado` (auto)

Al crear un `PagoDeuda`: `deuda.saldo_actual -= monto`; si el saldo llega a 0 (o menos) y `categoria.tipo_amortizacion == 'cuotas_fijas'`, marcar `deuda.estado = 'pagada'` automáticamente (mismo patrón de recalculo que `CotizacionDetalle.save()` dispara `cotizacion.calcular_totales()` en `cotizador_project/models.py`).

**Nota de implementación sobre `Gasto`**: `Gasto` vive en `finanzas_app/models.py` y no necesita ningún campo nuevo — la relación se declara del lado de `PagoDeuda` (M2M), así que `Gasto` no depende de que exista el módulo de Deudas. Esto mantiene el modelo `Gasto` sin cambios y evita migraciones invasivas sobre una tabla que ya está en uso.

## Backend — Endpoints propuestos

Mismo patrón que `finanzas_app/views.py`: ViewSets con `OrganizationFilterMixin` + `permission_classes = [IsAuthenticated, HasRolPermission]` + `permiso_por_accion`, montados en `finanzas_app/urls.py` bajo el prefijo `/api/finanzas/`.

```
GET/POST              /api/finanzas/categorias-deudas/
GET/PUT/PATCH/DELETE  /api/finanzas/categorias-deudas/{id}/
GET/POST              /api/finanzas/deudas/
GET/PUT/PATCH/DELETE  /api/finanzas/deudas/{id}/
GET/POST              /api/finanzas/deudas/{id}/pagos/            (acción custom: lista historial / registra un pago; el POST acepta `gastos_cubiertos: [id, id, ...]` opcional)
GET                   /api/finanzas/deudas/resumen/                (total adeudado + desglose por categoría)
GET                   /api/finanzas/deudas/proximos-vencimientos/  (pagos que vencen en los próximos N días)
GET                   /api/finanzas/gastos/?sin_pago_deuda=true    (filtro auxiliar: gastos aún no vinculados a ningún PagoDeuda, para poblar el selector al registrar un pago)
```

El último endpoint es un filtro adicional sobre el `GastoViewSet` ya existente (no una vista nueva) — sirve para que el selector de "gastos que cubre este pago" no muestre gastos ya saldados por otro pago anterior.

## Frontend — Ubicación y flujo UI

**Decisión de diseño**: nueva pestaña **"Deudas"** dentro de `frontend/src/pages/Finanzas/Finanzas.jsx` (junto a Ingresos/Gastos/Dashboard), **no** una página/nav-item separado como FIBRAs. A diferencia de FIBRAs (dominio propio con datos de mercado externos y simulaciones), Deudas es conceptualmente un tercer tipo de movimiento financiero de la organización, tan "casero" como Ingresos/Gastos — se reutiliza el mismo layout de tabs ya existente en vez de fragmentar la navegación con un ítem nuevo en el sidebar.

- **Alta rápida de categoría**: mismo componente `CategoriaQuickForm` ya usado en Ingresos/Gastos, sumando un `Select` para `tipo_amortizacion`.
- **Formulario "Nueva deuda"**: categoría (con creación rápida), acreedor, monto original, tasa de interés (opcional), pago periódico (opcional), día de pago, fecha de inicio, fecha de vencimiento — el formulario muestra/oculta estos últimos campos según el `tipo_amortizacion` de la categoría elegida (p. ej. oculta "fecha de vencimiento" si es `revolvente`).
- **Tabla de deudas activas** (componente `Table` existente): acreedor, categoría (burbuja de color, igual que Ingresos/Gastos), saldo actual, próximo pago, estado, acciones ("Registrar pago", editar, eliminar con `ConfirmDialog`).
- **"Registrar pago"** (reutiliza `Modal`, prop `wide`): monto, fecha, notas, **y un selector múltiple (checklist) de gastos existentes** (de la organización, sin vincular todavía a otro pago — vía el filtro `?sin_pago_deuda=true`) para marcar cuáles cubre este pago. El selector es opcional: se puede registrar un pago sin marcar ningún gasto. Al confirmar, refresca `saldo_actual` y el historial de esa deuda.
- **Historial de pagos**: tabla dentro del mismo modal ampliado, mostrando fecha, monto, saldo resultante y — si aplica — la lista de gastos que ese pago cubrió (con link/tooltip a la descripción del gasto).
- **Integración con el tab Dashboard existente**: 4ª card "Deuda Total Pendiente" (color rojo/naranja, junto a Ingresos/Gastos/Ganancia Neta), gráfica "Deuda por Categoría" (mismo patrón `BarChart` + `Cell` que ya existe para "Gastos por Categoría"), sección "Próximos vencimientos" (lista/tabla de pagos en los próximos 7-30 días).

Componentes/imports exactos a reutilizar (confirmados en el código real, mismas rutas relativas que ya usa `Finanzas.jsx`): `Card`, `Table`, `Button` (de `components/ui/`), `Field`/`Input`/`Select` (de `components/ui/Input.jsx`), `ConfirmDialog`, `EmptyState`, `Modal` (con prop `wide`), `PageHeader` (de `pages/PageHeader.jsx`), `api`/`getErrorMessage` (de `api/client.js`), iconos de `lucide-react`, gráficas `BarChart`/`Bar`/`XAxis`/`YAxis`/`CartesianGrid`/`Tooltip`/`ResponsiveContainer`/`Cell` de `recharts`, estilos de `pages/shared-form.module.css`.

## Validaciones

- `monto_original > 0`.
- Un pago no puede exceder `saldo_actual` (o se permite con aviso, dejando el saldo en 0 — decidir en implementación cuál UX se prefiere).
- `fecha_vencimiento` posterior a `fecha_inicio`.
- Campos requeridos varían según `tipo_amortizacion` de la categoría elegida — validar tanto en el serializer (backend) como en el formulario (frontend), igual que ya se hace con la validación de rango de fechas en Fibras/`SimulacionForm.jsx`.
- Un `Gasto` no debería poder marcarse como cubierto por dos `PagoDeuda` distintos a la vez (validar en el serializer del endpoint de pagos: rechazar si algún `gasto_id` recibido ya está en `pagos_deuda` de otro pago).

## Decisiones de diseño explícitas

Para que quien implemente no tenga que adivinar el razonamiento:

- **¿Por qué `PagoDeuda` se vincula a `Gasto` en vez de mantenerse totalmente independiente?** Porque en la práctica una deuda casi siempre *se originó* en uno o varios gastos ya registrados (una compra a proveedor a crédito, un cargo a la tarjeta), y cuando se paga esa deuda, el usuario quiere poder decir "este pago saldó aquellos gastos". Sin esta relación, Ingresos/Gastos y Deudas serían dos universos que no se hablan entre sí, perdiendo justamente la trazabilidad que Deudas debería aportar. La relación es un `ManyToManyField` **opcional** (`blank=True`) porque no todo pago corresponde a un gasto puntual (p. ej. el pago mínimo mensual de una tarjeta revolvente).
- **¿Por qué la relación vive en `PagoDeuda` y no en `Gasto`?** Para no tocar el modelo `Gasto` (ya en producción, con datos reales) y para que un mismo `Gasto` pueda, en teoría, ser referenciado por su pago correspondiente sin que `Gasto` necesite saber nada sobre deudas. Mantiene `finanzas_app` con una dependencia unidireccional: Deudas conoce a Gasto, Gasto no conoce a Deudas.
- **¿Por qué 3 tipos de amortización en vez de un campo de texto libre en la categoría?** Es lo que permite que el formulario muestre/oculte campos automáticamente según corresponda, y que el Dashboard pueda calcular "próximos vencimientos" de forma distinta para revolvente (recurrente, basado en `dia_pago`) vs. cuotas fijas/cuenta por pagar (basado en `fecha_vencimiento`).
- **¿Por qué un modelo `PagoDeuda` separado en vez de solo un campo `saldo_actual` que se edita?** Para tener trazabilidad — poder mostrarle al usuario "cuánto pagó cada mes y qué gastos cubrió", no solo el saldo actual, igual que Ingreso/Gasto ya dan trazabilidad de cada movimiento individual en vez de solo un total.

## Fases de implementación

- **Fase 1 (MVP)**: modelos `CategoriaDeuda`/`Deuda`/`PagoDeuda` (con el M2M a `Gasto`) + migración + siembra de categorías default al registrar una organización, CRUD completo vía API, registro de pagos con selector opcional de gastos cubiertos (resta saldo, sin cálculo de interés compuesto), pestaña "Deudas" en `Finanzas.jsx` con formularios y tabla, integración básica en el Dashboard (card de total + gráfica por categoría).
- **Fase 2 (futuro, fuera de este alcance)**: tabla de amortización con cálculo automático de interés compuesto mes a mes, notificaciones/alertas de vencimiento próximo, proyección "deuda libre para tal fecha" al ritmo de pago actual, sugerencia automática de qué gastos podrían corresponder a un pago (por monto/fecha/categoría aproximados) en vez de selección totalmente manual.

## Verificación end-to-end sugerida (para cuando se implemente)

1. Registrar una organización nueva → confirmar que las 9 categorías default aparecen sin acción manual.
2. Crear una deuda de cada `tipo_amortizacion` (revolvente, cuotas fijas, cuenta por pagar) → confirmar que el formulario muestra/oculta los campos correctos en cada caso.
3. Registrar un `Gasto` (p. ej. categoría "Proveedores"), luego crear una deuda de tipo `cuenta_por_pagar` y registrar un pago marcando ese `Gasto` como cubierto → confirmar que el pago queda vinculado y que el gasto ya no aparece disponible para otro pago.
4. Registrar un pago sin marcar ningún gasto (caso del pago mínimo de una tarjeta) → confirmar que funciona igual de bien sin la relación.
5. Pagar el saldo completo de una deuda de cuotas fijas → confirmar que pasa a `estado='pagada'` y desaparece de "próximos vencimientos".
6. Confirmar que la card y la gráfica del Dashboard reflejan el total de deuda correcto tras crear/pagar deudas, y que no se duplica nada en "Total Gastos".
7. Probar casos límite: categoría sin deudas asociadas (debe poder borrarse), categoría con deudas (debe rechazar el borrado, igual que `CategoriaIngreso`/`CategoriaGasto` con `PROTECT`), pago que excede el saldo pendiente, intento de marcar un gasto ya cubierto por otro pago (debe rechazarse con mensaje claro).

---

*Este documento es de planeación — no incluye implementación. Al ejecutarlo, seguir el patrón exacto de `backend/finanzas_app/` (models/serializers/views/urls) y `frontend/src/pages/Finanzas/Finanzas.jsx` ya existentes, para que Deudas se sienta como una extensión natural del módulo y no como un apéndice aparte.*
