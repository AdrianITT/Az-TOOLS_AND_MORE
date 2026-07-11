# Rediseño de Formularios — Plan de UX

> **Estado:** las 3 fases implementadas y desplegadas (2026-07-07). Componentes compartidos en `frontend/src/components/ui/FormExtras.jsx` (`MasOpciones`, `InputMonto`, `PasosFlujo`); `CategoriaInline` vive en `Finanzas.jsx`.

## El problema

El usuario reporta: los formularios son *"un caos"*, *"dan flojera"*, falta *"facilidad visual"*. Es el mismo mal de fondo que tenía el dashboard: **sin jerarquía y todo visible siempre** — pero en formularios se agrava, porque un formulario pide *trabajo*, y cada campo visible de más es fricción que invita a abandonar.

## Diagnóstico — los 6 problemas estructurales

### 1. El formulario siempre abierto secuestra la página
En Finanzas, al entrar a Ingresos/Gastos/Deudas lo primero que se ve es el **formulario de alta expandido** ocupando la mitad superior; la tabla de movimientos (lo que el usuario viene a *ver* la mayoría de las veces) queda empujada abajo. La acción más frecuente al entrar a una pestaña es consultar, no capturar — y hoy la página está optimizada para lo contrario.

### 2. Campos esenciales y opcionales con el mismo peso
- **Deuda** es el caso extremo: hasta **9 campos visibles** (categoría, acreedor, monto, fecha inicio, vencimiento, cuota, tasa, día de pago, notas) cuando lo esencial son 4. La tasa de interés o el día de pago son detalles que se pueden completar después — pero visualmente exigen lo mismo que el monto.
- **Ingreso/Gasto**: descripción es opcional pero ocupa una fila completa igual que el monto.
- **Servicio**: nombre/categoría/precio (esencial) + descripción + valores de atributos + gestión de plantillas de atributos, todo en la misma columna vertical.

### 3. Fricción evitable: la fecha nunca tiene default
En Ingreso, Gasto, Deuda y Pago, el campo fecha empieza **vacío** y es `required`. El 90% de los movimientos se registran el mismo día que ocurren — el usuario paga el "impuesto" de abrir el date picker en cada captura. Lo mismo con la categoría: nunca recuerda la última usada.

### 4. Cambio de contexto brusco al crear categoría
Elegir "+ Nueva categoría" **reemplaza el formulario completo** por el de categoría. El usuario que iba a la mitad de capturar un gasto ve desaparecer su formulario; al crear la categoría, vuelve — pero el efecto es de "¿a dónde se fue lo que estaba haciendo?".

### 5. Tareas administrativas mezcladas con el flujo de captura
- En Finanzas: "Gestionar categorías" es una card permanente entre el formulario y la tabla — ruido administrativo en medio del flujo diario (ya es colapsable, pero ocupa lugar siempre).
- En ServicioForm: la **gestión de plantillas de atributos** (crear atributos, opciones, orden) — una tarea de configuración que se hace una vez por categoría — vive dentro del formulario de alta de servicio, con su propia tabla, formulario punteado y hasta gestión de opciones anidada. Quien captura su servicio número 50 sigue viendo esa maquinaria.

### 6. Sin secuencia visual clara en Cotización
CotizacionForm es en realidad un flujo de 3 pasos (1. datos generales → 2. agregar servicios → 3. compartir/PDF) pero se presenta como dos cards apiladas donde el estado, los totales, los botones de compartir y el formulario de items compiten. El usuario nuevo no sabe que primero debe guardar para poder agregar servicios (el botón dice "Guardar y agregar servicios", pero la estructura no lo cuenta).

## Principios del rediseño

1. **La página muestra datos; el formulario aparece bajo demanda.** Botón primario "+ Registrar…" arriba; el form se abre en la misma página (card que se expande) con foco automático en el primer campo.
2. **3-4 campos esenciales visibles; el resto detrás de "Más opciones".** Plegado por defecto, recordando que TODO campo opcional visible es fricción.
3. **Defaults que eliminan tecleo**: fecha = hoy, categoría = última usada (localStorage), cantidad = 1, IVA = 16, precio = precio base (los tres últimos ya existen).
4. **El monto es el protagonista**: input más grande y con foco visual — es EL dato del movimiento.
5. **Crear categoría sin perder contexto**: mini-formulario inline (una fila: nombre + color + botón) que aparece *debajo del select*, sin desmontar el formulario padre.
6. **Lo administrativo se va a su lugar**: gestión de categorías y de atributos accesible pero fuera del camino del flujo diario.
7. **Los flujos multi-paso se muestran como pasos.**

## Propuesta por formulario

### Finanzas — Ingresos / Gastos (mismo patrón)

```
┌──────────────────────────────────────────────────┐
│  Gastos                    [+ Registrar gasto]   │  ← botón primario
├──────────────────────────────────────────────────┤
│  (al hacer clic se expande esta card:)           │
│  ┌────────────────────────────────────────────┐  │
│  │  Monto        Categoría                    │  │
│  │  [$ 0.00 ]    [Operativo ▾ | + nueva]      │  │  ← monto grande,
│  │  Fecha: [hoy ▾]                            │  │    categoría recuerda
│  │  ▸ Más opciones (descripción)              │  │    la última usada
│  │  [Registrar]  [Cancelar]                   │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  Total del listado + tabla de movimientos        │
│  ⚙ Gestionar categorías (link discreto arriba    │
│     de la tabla, abre el manager colapsable)     │
└──────────────────────────────────────────────────┘
```

- Form **cerrado por defecto**; al abrir, foco en Monto.
- Fecha default hoy; categoría default = última usada por tipo (localStorage `finanzas:ultimaCategoria:gastos`).
- "+ Nueva categoría" en el select abre el mini-form inline debajo (nombre + color + crear), sin reemplazar nada; al crear, queda seleccionada.
- Tras registrar: el form se limpia (fecha vuelve a hoy, categoría se conserva), queda abierto para captura en ráfaga, y la fila nueva se resalta en la tabla (patrón `rowJustAdded` que ya existe en Cotización).
- Descripción bajo "▸ Más opciones".

### Finanzas — Deudas

Mismo patrón de apertura bajo demanda, más:
- **Esenciales siempre visibles (4)**: categoría, acreedor, monto original, fecha de inicio (default hoy).
- **Según tipo de amortización** (ya funciona así): vencimiento/cuota solo si aplican — se quedan en el bloque esencial porque definen la deuda.
- **"▸ Más opciones"**: tasa de interés, día de pago, notas — detalles completables después con editar.
- El formulario indica el tipo elegido con una línea de ayuda: *"Revolvente: el saldo sube y baja; sin fecha de fin"* — hoy el usuario debe adivinar por qué aparecen/desaparecen campos.

### Cotización — pasos explícitos

Mantener la mecánica actual (que es correcta) pero **contarla visualmente**:

```
  ① Datos ─────── ② Servicios ─────── ③ Compartir
```

- Barra de pasos arriba de la card (solo indicador visual, no rompe nada): en "nueva", paso 1 activo y 2-3 apagados con hint *"Guardá los datos para agregar servicios"*; al editar, 1 ✓ y 2 activo; con ≥1 item, 3 se enciende (PDF/QR/compartir).
- Card de datos: cliente + vencimiento (esenciales); IVA y descripción bajo "▸ Más opciones" (el IVA ya tiene default 16 — casi nunca se toca).
- Estado + totales salen del formulario a una **franja resumen** propia arriba de la card de servicios (el estado es del documento, no un campo editable más).
- El draft-card de agregar servicio ya está bien resuelto (borde punteado, badge "sin agregar") — se conserva tal cual.

### Servicio — separar captura de configuración

- Card principal: nombre, categoría, precio (esenciales) + descripción en "▸ Más opciones". Los **valores de atributos** de la categoría siguen apareciendo al elegirla (eso está bien — son datos del servicio).
- La **gestión de plantillas de atributos** (crear/borrar atributos, opciones) sale del flujo: se colapsa a un link discreto "⚙ Configurar atributos de esta categoría" que abre lo mismo que hoy pero cerrado por defecto y visualmente subordinado. Quien configura una categoría nueva lo encuentra; quien captura el servicio 50 no lo ve.

## Componentes compartidos a crear (una vez, usar en todos)

| Componente | Qué hace | Dónde se usa |
|---|---|---|
| `FormularioDesplegable` | botón primario "+ Registrar X" → expande card con foco en primer campo, botón cancelar la colapsa | Ingresos, Gastos, Deudas |
| `MasOpciones` | acordeón "▸ Más opciones (n)" para campos opcionales | los 5 formularios |
| `CategoriaInline` | mini-form nombre+color(+tipo para deudas) debajo del select, sin desmontar el form padre | Ingresos, Gastos, Deudas, Servicio (categoría de servicio es texto — solo inline input, ya existe) |
| `PasosFlujo` | indicador ①②③ con estados hecho/activo/pendiente | Cotización |
| `InputMonto` | input de monto grande (fuente 20px+, prefijo $) | Ingresos, Gastos, Deudas, Pago |

Todo con los componentes UI existentes (`Card`, `Button`, `Field`, `Input`, `Select`) y `shared-form.module.css` — se agregan clases, no se reemplaza el sistema.

## Qué NO cambia

- La mecánica de datos: mismos endpoints, mismos payloads, cero cambios de backend.
- El patrón draft-card de Cotización/Servicio (borde punteado + badge) — ya resuelve bien "esto aún no está guardado".
- El badge "Cambios sin guardar" y los ConfirmDialog de descarte.
- La validación condicional por tipo de amortización en Deudas.

## Fases

- **Fase 1 — Finanzas (mayor dolor, patrón nuevo completo)**: `FormularioDesplegable` + `MasOpciones` + `CategoriaInline` + `InputMonto` + defaults (fecha hoy, última categoría) en Ingresos, Gastos y Deudas. Gestión de categorías como link discreto sobre la tabla.
- **Fase 2 — Servicio**: "Más opciones" + configuración de atributos subordinada y colapsada.
- **Fase 3 — Cotización**: barra de pasos + IVA/descripción plegados + franja de estado/totales.

## Verificación cuando se implemente

1. **Prueba de la flojera**: registrar un gasto de hoy en la categoría habitual debe tomar exactamente 3 interacciones: clic en "+ Registrar gasto" → teclear monto → Enter (fecha y categoría ya puestas).
2. Al entrar a cada pestaña de Finanzas, lo primero visible es la tabla de movimientos, no un formulario.
3. Crear una categoría a mitad de captura no hace desaparecer el formulario ni pierde lo tecleado.
4. El formulario de deuda muestra máximo 5-6 campos sin abrir "Más opciones", y explica en una línea qué significa el tipo elegido.
5. En cotización nueva, el usuario entiende sin leer el botón que los servicios vienen después de guardar (pasos visibles).
6. Registrar 3 gastos seguidos no exige reabrir el formulario ni volver a elegir categoría/fecha.
7. Nada de lo actual deja de poder hacerse (gestión de categorías/atributos accesible, solo reubicada).
