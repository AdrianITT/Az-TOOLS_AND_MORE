# Rediseño del Dashboard de Finanzas — Plan de UX

> **Estado:** Fase 1 implementada y desplegada (2026-07-07). Pendientes: Fase 2 (selector de período, carga diferida por tab) y Fase 3 (sparklines, año contra año, metas).

Documento de planeación — **no implementar hasta que se apruebe**. Analiza por qué el dashboard actual abruma al usuario y propone un rediseño por niveles de atención.

## El problema

El usuario reporta: *"se pierde en tantos datos, son tantos datos que uno no sabe a dónde mirar"*. Es un diagnóstico correcto — el dashboard actual no tiene jerarquía: es una **pila vertical de 7 bloques del mismo ancho y peso visual**, donde una tabla de 12 meses pesa lo mismo que la alerta de un pago que vence mañana.

## Inventario de lo que hay hoy (tab Dashboard de `Finanzas.jsx`)

| # | Bloque | Forma | Alcance temporal | Datos visibles |
|---|--------|-------|------------------|----------------|
| 1 | 4 cards: Total Ingresos / Total Gastos / Ganancia Neta / Deuda Pendiente | stat cards | **todo el histórico** | 4 números |
| 2 | Resumen Mensual | tabla 12 filas × 4 columnas + botón | últimos 12 meses | ~48 celdas |
| 3 | Resumen por Categoría (Ingresos) | tabla | mes actual | 3 col × N categorías |
| 4 | Días con mayor gasto | BarChart vertical | mes actual | hasta 10 barras |
| 5 | Gastos por Categoría | BarChart horizontal multicolor | mes actual | N barras |
| 6 | Deuda por Categoría | BarChart horizontal | estado actual | N barras |
| 7 | Próximos vencimientos | tabla | próximos 30 días | 5 col × N filas |

**Más de 100 datos simultáneos en pantalla**, sin orden de lectura, sin respuesta a la pregunta que el usuario trae al abrir el dashboard: *"¿cómo voy?"*.

## Diagnóstico — los 5 problemas de fondo

### 1. Sin jerarquía de atención
Todo tiene el mismo peso visual. La información más **accionable** (un vencimiento en 3 días) está al final de la página; la menos útil (el total histórico de ingresos desde el día uno) está arriba en tamaño 24px. El orden actual es el orden en que se programaron los bloques, no el orden en que el usuario los necesita.

### 2. Alcances temporales mezclados y sin reconciliar
Las 4 cards suman **todo el histórico** (`ingresos.reduce(...)` sobre la lista completa); la tabla es de 12 meses; las gráficas son del mes actual. Tres relojes distintos sin etiquetarlo con claridad. Consecuencias:
- "Total Ingresos $48,350" arriba y "$4,850 en julio" abajo parecen contradictorios — el usuario no sabe cuál mirar.
- El total histórico **empeora con el tiempo**: en 2 años será un número gigante sin significado operativo. Nadie gestiona un negocio con "cuánto he ingresado desde que existo".

### 3. Anti-patrones de visualización
- **Multicolor sin significado**: "Gastos por Categoría" pinta cada barra de un color distinto ciclando `CATEGORIA_COLORS[index % 8]`. El trabajo de esa gráfica es comparar magnitudes, no identificar series — el color no aporta nada y además **cambia con el orden**: si una categoría sube de posición, cambia de color entre visitas (el usuario que aprendió "Proveedores es azul" queda desorientado). Regla: barras de magnitud en **un solo tono**; la identidad de la categoría la da su etiqueta (y su punto de color de la BD, que hoy se ignora).
- **Tabla donde va una gráfica y gráfica donde va una tabla**: el Resumen Mensual (la evolución en el tiempo — el trabajo clásico de una gráfica de líneas) es una tabla de 48 celdas; el Resumen por Categoría de ingresos es tabla mientras el de gastos es gráfica — mismo trabajo, dos formas distintas.
- **Números sin separador de miles**: `formatMoneda` produce `$48350.00` — a partir de 5 cifras se leen mal. Falta `Intl.NumberFormat('es-MX')` → `$48,350.00`.

### 4. Redundancia
Bloques 3 y 5 son el mismo concepto (desglose por categoría) con formas distintas. El bloque 4 (días con mayor gasto) es un detalle forense que casi nunca cambia decisiones — no merece estar siempre visible.

### 5. Sin control del usuario
No hay selector de período. El usuario no puede preguntar "¿y el mes pasado?" sin salir del dashboard. Todo llega de golpe: 12 llamadas API al montar la página, se mire o no el dashboard.

## Principio rector del rediseño

**Un dashboard se lee en 3 niveles de atención, y cada nivel debe caber en su tiempo:**

- **Nivel 1 — 5 segundos**: ¿cómo voy este mes? ¿hay algo urgente? → un número héroe + 3 tiles + alerta condicional.
- **Nivel 2 — 30 segundos**: ¿cuál es la tendencia? → **una** gráfica principal.
- **Nivel 3 — bajo demanda**: ¿dónde exactamente? → desgloses colapsados que el usuario abre si quiere.

Lo que no cabe en su nivel, baja un nivel o desaparece. "Mostrar todo por si acaso" es la causa del problema actual.

## Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  [⚠ ALERTA — solo si existe]                                 │
│  2 pagos vencen esta semana: Distribuidora XYZ (3 días)…     │
│  → clic lleva a la pestaña Deudas                            │
├─────────────────────────────────────────────────────────────┤
│  Periodo:  [ Este mes ▾ ]   (Este mes / Mes pasado / Año)    │  ← una sola
├─────────────────────────────────────────────────────────────┤     fila de
│                » Balance de julio «                          │     filtro,
│                    $2,875.00                                 │     arriba de
│              ▲ +18% vs junio   (verde/rojo)                  │     todo lo
│                                                              │     que filtra
│  ┌───────────────┬───────────────┬───────────────┐          │
│  │ Ingresos      │ Gastos        │ Deuda pendiente│          │
│  │ $4,850.00     │ $1,975.00     │ $6,000.00      │          │
│  │ ▲ +12% vs jun │ ▼ −5% vs jun  │ ▼ −$1,200      │          │
│  └───────────────┴───────────────┴───────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Tendencia (12 meses)                                        │
│  [gráfica de líneas: ingresos vs gastos — 2 series,          │
│   clic en un mes abre el modal detalle-mes ya existente]     │
├─────────────────────────────────────────────────────────────┤
│  ▸ Gastos por categoría        (colapsado por defecto)       │
│  ▸ Ingresos por categoría      (colapsado)                   │
│  ▸ Deudas y vencimientos       (colapsado)                   │
│  ▸ Tabla mensual completa      (colapsado)                   │
└─────────────────────────────────────────────────────────────┘
```

### Nivel 1 — Respuesta inmediata

- **Alerta de vencimientos (condicional)**: banner compacto arriba de todo, **solo si hay vencimientos en ≤7 días**. Es la única información del dashboard que exige acción; hoy está enterrada al final. Un renglón: cuántos, el más próximo, clic → pestaña Deudas. Color de estado (naranja/rojo), con ícono + texto, nunca color solo.
- **Número héroe**: el **balance del período seleccionado** (ingresos − gastos), grande (~40-48px), con delta vs período anterior (▲/▼ + % + color de estado). Es LA respuesta a "¿cómo voy?".
- **KPI row de 3 tiles**: Ingresos, Gastos, Deuda pendiente — **del período seleccionado** (no histórico), cada uno con su delta vs período anterior. La "Ganancia Neta" desaparece como tile porque ES el héroe. Los totales históricos desaparecen del dashboard (siguen visibles en las pestañas Ingresos/Gastos, donde sí son el contexto natural de la tabla completa).

### Nivel 2 — Una sola gráfica principal

- **Tendencia 12 meses**: líneas de ingresos vs gastos (2 series, verde/rojo ya establecidos en la app, con leyenda). Reemplaza la tabla de 48 celdas como elemento principal — la tendencia es exactamente el trabajo de una línea, no de una tabla. Clic (o botón) en un mes → abre el **modal detalle-mes que ya existe** (se reutiliza tal cual). Tooltip al pasar el cursor con los 3 valores del mes.

### Nivel 3 — Desgloses bajo demanda (colapsables)

Secciones tipo acordeón, **colapsadas por defecto**, con resumen en el encabezado para decidir si vale la pena abrirlas (ej. "Gastos por categoría — mayor: Proveedores $1,200"):

1. **Gastos por categoría**: barras horizontales en **un solo tono rojo**, punto de color de la categoría (de la BD) junto a la etiqueta, % del total al final de cada barra. Aquí adentro vive también "días con mayor gasto" (el detalle forense).
2. **Ingresos por categoría**: misma forma exacta, un solo tono verde. (Hoy es tabla — se unifica.)
3. **Deudas y vencimientos**: la gráfica "Deuda por Categoría" + la tabla completa de próximos vencimientos (30 días). La alerta del Nivel 1 es el resumen; esto es el detalle.
4. **Tabla mensual completa**: la tabla actual de 12 meses, para quien la prefiere — no se elimina, se degrada de protagonista a opción.

### Selector de período

Una sola fila de filtro arriba (nunca filtros por-gráfica): **Este mes / Mes pasado / Este año**. Aplica a héroe, tiles y desgloses del Nivel 3. La tendencia de 12 meses no se filtra (su período es fijo por naturaleza). Fase 1 puede arrancar solo con "Este mes" + deltas y agregar el selector después — la estructura no cambia.

## Decisiones de diseño explícitas

- **¿Por qué eliminar los totales históricos de las cards?** Porque un total desde-el-inicio no responde ninguna pregunta operativa y crece hasta volverse ruido. El período operativo de un negocio pequeño es el mes. Quien quiera el histórico lo tiene en las pestañas de lista.
- **¿Por qué colapsado por defecto y no "todo visible"?** El costo de un clic para abrir un desglose es menor que el costo de escanear 100 datos para encontrar uno. El encabezado con mini-resumen le dice al usuario si vale la pena abrir.
- **¿Por qué un solo tono en las barras por categoría?** El trabajo es comparar tamaños; el multicolor actual no identifica nada (se recicla por índice) y desorienta cuando el orden cambia. La identidad la da la etiqueta + el punto del color real de la categoría.
- **¿Por qué línea y no tabla para la tendencia?** 12 meses × 3 series = 36 números que en tabla exigen leer y comparar mentalmente; en línea, la pendiente se lee en un vistazo. La tabla sobrevive colapsada para quien la quiera.
- **¿Por qué la alerta arriba y no una card más?** Porque es la única pieza con urgencia real y fecha límite. Una card más en la fila de KPIs compite; un banner condicional (que casi siempre NO está) interrumpe solo cuando debe.

## Cambios técnicos necesarios

**Frontend (`Finanzas.jsx` — la mayor parte):**
- `formatMoneda` con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` — beneficia a toda la página, no solo al dashboard.
- Componentes nuevos pequeños: `HeroBalance`, `StatTile` (valor + delta), `AlertaVencimientos`, `SeccionColapsable`. Todo con los componentes UI existentes (`Card`, `Table`, `Modal`) + recharts (`LineChart` se agrega a los imports).
- Deltas vs período anterior: **calculables en el cliente** con datos que ya llegan (el endpoint `/finanzas/dashboard/` ya trae los 12 meses — el delta del mes es `mes[n] vs mes[n-1]`, cero llamadas nuevas).
- Carga diferida: mover las llamadas del dashboard a un efecto que dispara al entrar al tab (hoy las 12 llamadas se hacen al montar la página aunque el usuario nunca abra Dashboard).

**Backend (mínimo):**
- `resumen-por-categoria` y `gastos-por-dia` ya aceptan `?periodo=mes|año`; para "Mes pasado" se necesita aceptar `?mes=YYYY-MM` (cambio pequeño en 2 vistas). Puede diferirse a Fase 2 si Fase 1 arranca solo con "Este mes".
- Nada más — deudas, resumen y vencimientos ya existen.

## Fases

- **Fase 1 (el 80% del valor)**: héroe + 3 tiles con delta, alerta condicional de vencimientos, gráfica de tendencia 12 meses (reemplaza tabla como protagonista), desgloses colapsables reutilizando las gráficas/tablas existentes, `formatMoneda` con separador de miles, un solo tono en barras de magnitud.
- **Fase 2**: selector de período completo (Este mes / Mes pasado / Este año) con el cambio de backend, carga diferida por tab, clic-en-mes de la gráfica → modal detalle.
- **Fase 3 (opcional)**: sparklines en los tiles, comparativa año contra año, meta de gasto mensual configurable con meter.

## Verificación cuando se implemente

1. **Prueba de los 5 segundos**: abrir el dashboard y contar qué se percibe sin scroll: debe ser exactamente héroe + 3 tiles (+ alerta si aplica). Nada más compite.
2. Con un vencimiento a ≤7 días, el banner aparece arriba; sin vencimientos, no existe.
3. Los deltas cuadran contra la tabla mensual (mes actual vs anterior).
4. Las barras por categoría: un solo tono, punto del color de la BD en la etiqueta, % del total visible, y el orden no cambia colores.
5. `$12,345.67` con separador de miles en TODA la página.
6. Todos los datos de hoy siguen accesibles (nada se pierde — solo cambia de nivel).
7. Con una organización sin movimientos: el dashboard muestra estado vacío amigable, no una pila de gráficas vacías.
