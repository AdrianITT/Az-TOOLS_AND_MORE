# Escaneo de recibos con OCR — Gastos e Ingresos desde fotos

> **Estado:** Fases 1 y 2 implementadas, desplegadas y verificadas (2026-07-10). Hallazgos de implementación: (1) tesseract necesita `--psm 6` para tickets — sin eso separa etiquetas y montos en columnas; (2) el helper `static()` de Django devuelve `[]` con `DEBUG=False`, así que `/media/` nunca se sirvió en producción hasta ahora — corregido con `django.views.static.serve` explícito; (3) los comprobantes se exponen como URL **relativa** (`/media/…`) para funcionar igual desde LAN y Tailscale.
>
> **Fases 2.5 y 4 (A y B) implementadas, desplegadas y verificadas (2026-07-12):** categoría inline en las cards de revisión (por card, sin afectar a las demás), modo deuda del escaneo (factura → deuda con vencimiento detectado, `?contexto=deuda`), y escaneo de comprobante en el modal de pagos (pre-llena monto/fecha y adjunta la foto). 18 tests de parsing en verde. Migración `0004_comprobante_deudas` aplicada. Fase 3 (preprocesado OpenCV / sugerencia de categoría) sigue condicionada al acierto con tickets reales.

## Objetivo

Que el usuario pueda **fotografiar o subir uno o varios recibos/tickets** y el sistema extraiga los datos (monto, fecha, comercio) para pre-llenar movimientos de Finanzas. El usuario revisa, corrige, asigna la categoría y decide si es gasto o ingreso — **la máquina propone, el humano confirma**. Nada se guarda automáticamente.

## Respuestas a las preguntas planteadas

| Pregunta | Respuesta |
|---|---|
| ¿Es posible en el punto que está el proyecto? | **Sí** — el backend ya maneja subida de archivos (PDF Tools, logo), Pillow ya está instalado, y Finanzas ya tiene el CRUD de gastos/ingresos donde desembocan los datos. |
| ¿Qué se necesita para analizar imágenes? | **OCR** (correcto) + **parsing** del texto crudo para extraer monto/fecha/comercio — el OCR solo devuelve texto; la extracción estructurada es la mitad del trabajo. |
| ¿Qué dependencias? | Aquí propongo un cambio respecto a la idea original: **no `tesseract.js` (frontend)** sino **`pytesseract` (backend)** — ver justificación abajo. |
| ¿Cámara del teléfono o computadora? | **Sí, sin código especial**: `<input type="file" accept="image/*" capture="environment" multiple>` abre la cámara nativa en móviles y el selector de archivos en desktop. No se necesita `getUserMedia` en fase 1. |

## Decisión clave: OCR en el backend, no en el navegador

`tesseract.js` funciona, pero para este proyecto el backend es mejor en todo:

| Criterio | `tesseract.js` (navegador) | `pytesseract` (backend) ✅ |
|---|---|---|
| Descarga inicial | ~15 MB de WASM + traineddata **por dispositivo** | Cero — vive en la imagen Docker |
| Velocidad en un teléfono viejo | Lenta (CPU del cliente) | La del servidor, consistente |
| Preprocesado de imagen (clave para tickets) | Limitado | Pillow ya instalado: escala de grises, contraste, umbral |
| Español (`spa` traineddata) | Descarga extra por cliente | Un `apt-get install tesseract-ocr-spa` en el Dockerfile |
| Consistencia de resultados | Varía por dispositivo/versión | Idéntica siempre, testeable |
| Patrón del proyecto | Nuevo | Igual que PDF Tools: subir archivo → procesar → responder |

**Dependencias reales:**
- `backend/Dockerfile`: agregar `tesseract-ocr` y `tesseract-ocr-spa` al `apt-get install` existente.
- `requirements.txt`: agregar `pytesseract`.
- Frontend: **cero dependencias nuevas**.

## Diseño del flujo

```
Finanzas → pestaña Gastos (o Ingresos)
   [+ Registrar gasto]  [📷 Escanear recibos]   ← botón nuevo junto al existente
                              │
                              ▼
   ┌─────────────────────────────────────────┐
   │  Subí o fotografiá tus recibos          │
   │  [ 📷 Tomar foto / elegir imágenes ]    │  ← input capture, multiple
   │  (hasta 10 por tanda)                   │
   └─────────────────────────────────────────┘
                              │  POST /api/finanzas/recibos/analizar/
                              ▼
   ┌─────────────────────────────────────────┐
   │  Revisión — 1 card por recibo:          │
   │  ┌─────────┐  Monto:  [$ 385.50]        │  ← pre-llenado por OCR,
   │  │ (miniatura) Fecha: [2026-07-10]      │    todo editable
   │  └─────────┘  Descripción: [OXXO SUC..] │
   │     Tipo:  (•) Gasto  ( ) Ingreso       │
   │     Categoría: [Operativo ▾]            │  ← la asigna el usuario
   │     [✓ Registrar]  [Descartar]          │
   │  ── siguiente recibo… ──                │
   └─────────────────────────────────────────┘
                              │  al confirmar cada card
                              ▼
              POST /finanzas/gastos/ (o /ingresos/) — endpoints existentes
```

- La revisión muestra la **confianza** de lo detectado: si el OCR no encontró monto o fecha, el campo queda vacío y resaltado — nunca se inventa un valor.
- Reutiliza los defaults del rediseño de formularios: última categoría usada, fecha de hoy como fallback si no se detectó.
- El texto crudo del OCR queda visible en un "▸ Ver texto detectado" por si el usuario quiere verificar.

## Backend

### Endpoint

```
POST /api/finanzas/recibos/analizar/     (multipart, campo `imagenes`, máx. 10)
→ 200: [
    {
      "archivo": "ticket1.jpg",
      "monto": "385.50" | null,        ← mejor candidato
      "fecha": "2026-07-10" | null,
      "comercio": "OXXO SUC CENTRO" | null,
      "texto_crudo": "…",
      "confianza": "alta" | "media" | "baja"
    },
    …
  ]
```

- Autenticado (mismo `IsAuthenticated` + organización del usuario que todo Finanzas).
- Procesa en memoria — **no guarda las imágenes** en fase 1.
- Límite: 10 imágenes por request, ~5 MB c/u (validar en serializer). El OCR toma ~2-5 s por imagen; con 10 son hasta 50 s — el `proxy_read_timeout` de nginx ya está en 120 s, alcanza.

### Pipeline por imagen

1. **Preprocesado (Pillow)**: escala de grises → autocontraste → redimensionar si es enorme (máx. ~2000 px de lado). Esto sube el acierto del OCR en tickets más que cualquier otra cosa.
2. **OCR**: `pytesseract.image_to_string(img, lang='spa')`.
3. **Parsing (heurísticas para tickets mexicanos)**:
   - **Monto**: buscar líneas con `TOTAL`, `IMPORTE`, `TOTAL A PAGAR` y tomar el número asociado; fallback: el monto más grande con formato `$1,234.56` del texto. Se reporta `null` si no hay candidato.
   - **Fecha**: regex de formatos comunes (`dd/mm/yyyy`, `dd-mm-yy`, `10 JUL 2026`); si hay varias, la más cercana a hoy hacia atrás.
   - **Comercio**: primeras 1-2 líneas no vacías del ticket (los tickets ponen el nombre arriba); se ofrece como descripción editable.
   - **Confianza**: alta = monto y fecha detectados; media = solo monto; baja = nada (solo texto crudo).
4. El parsing vive en `finanzas_app/services/ocr_recibos.py` como funciones puras → **testeables sin imágenes** (se testean con strings de texto de tickets reales).

## Qué NO hace (alcance honesto)

- **No categoriza automáticamente** — el usuario asigna la categoría (así lo pediste, y es lo correcto: la categoría es criterio del negocio, no del ticket).
- **No lee tickets ilegibles**: fotos borrosas, arrugadas o con poca luz darán confianza "baja" y el usuario captura a mano — el flujo degrada a formulario normal, nunca bloquea.
- **No guarda las fotos** en fase 1 (ver fase 2).
- **No es facturación/CFDI**: extrae datos para el registro interno de Finanzas, no interpreta XML fiscales.

## Fases

- **Fase 1 (MVP)**: Dockerfile + pytesseract, endpoint `analizar`, servicio de parsing con tests, botón "📷 Escanear recibos" en Gastos/Ingresos, pantalla de revisión con cards editables que desembocan en los endpoints existentes.
- **Fase 2**: guardar la foto como comprobante — campo `comprobante` (ImageField, nullable) en `Gasto`/`Ingreso` + miniatura en la tabla de movimientos y en el detalle del mes. Da valor de auditoría ("¿de qué era este gasto? — mirá el ticket").
- **Fase 3 (si el acierto del OCR queda corto)**: mejoras de preprocesado (deskew/binarización con OpenCV), sugerencia de categoría por historial (si "OXXO" siempre fue "Operativo", proponerla preseleccionada — el usuario sigue confirmando).

## Fase 2.5 — Crear categoría desde la card de revisión (problema reportado)

**El problema:** al revisar un recibo escaneado, si la categoría que corresponde no existe, el selector de la card no ofrece crearla — el usuario tiene que cerrar el modal (perdiendo el análisis hecho), ir al formulario normal, crear la categoría, y volver a escanear. Es exactamente el anti-patrón de "cambio de contexto brusco" que ya se eliminó de los formularios en [FormulariosUX](FormulariosUX.md).

**La solución** reutiliza lo que ya existe:

1. **Mover `CategoriaInline`** de `Finanzas.jsx` a `components/ui/CategoriaInline.jsx` (hoy es privado de esa página; lo necesitan dos componentes).
2. En el selector de categoría de cada card de `EscanearRecibos.jsx`, agregar la opción **"+ Nueva categoría"** (mismo `NUEVA_CATEGORIA` centinela). Al elegirla, se muestra `CategoriaInline` dentro de la card — sin desmontar nada, igual que en los formularios.
3. Al crear: POST a `/finanzas/categorias-gastos/` o `/categorias-ingresos/` según el tipo de la card, la nueva categoría queda **seleccionada en esa card** y disponible en las demás. Como las listas de categorías viven en `Finanzas.jsx` (props), `EscanearRecibos` recibe dos callbacks nuevos (`onCrearCategoriaGasto`, `onCrearCategoriaIngreso`) que reutilizan los handlers existentes del padre — así la pestaña de fondo también queda actualizada sin recargar.

**Detalle a cuidar:** cada card mantiene su propio estado de "creando categoría" (si tenés 5 recibos, abrir el mini-form en la card 2 no debe afectar a las otras).

## Fase 4 — OCR en Deudas (análisis de viabilidad y flujo)

### ¿Es posible? Sí — y con la mayor parte del pipeline ya construido

El OCR, el preprocesado, el endpoint y el patrón de revisión ya existen. Lo nuevo es **qué se extrae y a dónde desemboca**. La diferencia clave con los tickets: los documentos de deuda son **facturas a crédito y estados de cuenta**, y su dato más valioso es el **vencimiento — una fecha futura**, que el parser actual descarta a propósito (`detectar_fecha` rechaza fechas > hoy porque un ticket no viene del futuro). Se necesita un modo de parsing distinto, no un parser nuevo.

### Los dos documentos y sus flujos

**A. Factura a crédito / pagaré → crear una Deuda**

El caso más valioso: compraste a crédito, tenés la factura con "VENCE 15/08/2026" y querés que la deuda quede registrada con su vencimiento.

```
Pestaña Deudas → [📷 Escanear factura]
   → POST /finanzas/recibos/analizar/?contexto=deuda
   → card de revisión con el formulario de deuda pre-llenado:
       acreedor        ← comercio detectado
       monto_original  ← total detectado
       fecha_inicio    ← fecha de emisión (la fecha pasada más reciente)
       fecha_vencimiento ← fecha FUTURA detectada, o emisión + días de crédito
       categoría       ← la elige el usuario (con "+ Nueva" inline, Fase 2.5)
   → hint del tipo de amortización (ya existe) + "Ver texto detectado"
   → [Registrar deuda] → POST /finanzas/deudas/ (endpoint existente)
```

**B. Comprobante de pago → registrar un PagoDeuda**

Dentro del modal de pagos de una deuda: botón "📷 Escanear comprobante" que pre-llena monto y fecha del pago y adjunta la foto. Desemboca en el endpoint de pagos existente. Aquí también aplica el checklist de gastos cubiertos — el OCR no decide eso, el usuario sigue marcando.

### Cambios de backend necesarios

1. **Parser en modo deuda** (`ocr_recibos.py`): nueva función `detectar_fechas_deuda(texto)` que devuelve `{emision, vencimiento}`:
   - *Emisión*: la lógica actual (fecha pasada más reciente).
   - *Vencimiento*: fechas **futuras** (hasta +2 años) priorizando las cercanas a etiquetas `VENCE`, `VENCIMIENTO`, `FECHA LÍMITE`, `PAGO ANTES DE`, `PAGAR ANTES DE`; además, detectar `CRÉDITO 30 DÍAS` / `30 DÍAS` y calcular emisión + N días como fallback.
   - El endpoint existente acepta `?contexto=deuda` (default `movimiento`) y agrega `fecha_vencimiento` a la respuesta. Un solo endpoint, dos modos — el pipeline OCR es idéntico.
2. **Campo `comprobante`** en `Deuda` y `PagoDeuda` (ImageField como el de Gasto/Ingreso) + migración `0004` + serializers con la misma URL relativa + `parser_classes` multipart en `DeudaViewSet` (el action `pagos` incluido).
3. Tests nuevos del parsing en modo deuda (strings de facturas: vencimiento etiquetado, "crédito 30 días", factura sin vencimiento).

### Cambios de frontend

- Botón "📷 Escanear factura" en la pestaña Deudas junto a "+ Registrar deuda".
- `EscanearRecibos` generalizado con prop `modo`: `'movimiento'` (hoy) o `'deuda'` — cambia los campos de la card (acreedor/vencimiento en vez de tipo gasto/ingreso) y el endpoint destino. Misma UI de confianza, texto crudo y descarte.
- En el modal de pagos: botón de escanear comprobante que pre-llena el form de pago existente.
- Miniatura del comprobante en la tabla de deudas y en el historial de pagos (mismo `MiniaturaComprobante`).

### Qué NO hace (alcance honesto)

- **No detecta el tipo de amortización**: una factura no dice si es revolvente o cuota fija — la categoría la elige el usuario, igual que siempre.
- **No actualiza saldos de tarjeta desde estados de cuenta** (caso complejo: un estado de cuenta trae decenas de montos — saldo anterior, pago mínimo, saldo al corte). Queda explícitamente fuera; si se quisiera, sería una fase propia con parsing dedicado.
- **No interpreta CFDI/XML**: solo la imagen.

### Orden de implementación sugerido

1. Fase 2.5 (categoría inline en cards) — es un fix corto y desbloquea la UX de todo lo demás.
2. Fase 4-A (factura → deuda): parser modo deuda + tests, campo comprobante + migración, botón y cards en Deudas.
3. Fase 4-B (comprobante → pago): reutiliza todo lo de 4-A, solo cambia el destino.

### Verificación de las Fases 2.5 y 4 cuando se implementen

1. Escanear un recibo con categoría inexistente → crearla inline desde la card → queda seleccionada y el movimiento se registra; las demás cards ven la nueva categoría.
2. Factura con "VENCE dd/mm/aaaa" futuro → la card de deuda llega con vencimiento correcto; el parser de movimientos (tickets) sigue descartando fechas futuras (no se rompe lo existente).
3. Factura "CRÉDITO 30 DÍAS" sin fecha explícita de vencimiento → vencimiento = emisión + 30.
4. Registrar la deuda desde la card → aparece en la tabla con su miniatura, y el vencimiento entra a "Próximos vencimientos" del dashboard.
5. Escanear comprobante en el modal de pagos → pago pre-llenado, saldo actualizado, foto en el historial.
6. Tests de parsing modo deuda en verde sin afectar los 13 existentes.

## Verificación de la Fase 1 (ya ejecutada)

1. Subir 3 fotos de tickets reales (uno nítido, uno regular, uno borroso) → el nítido llega con monto+fecha correctos, el borroso llega con confianza "baja" y campos vacíos, ninguno inventa datos.
2. Desde un teléfono en la red: el botón abre la cámara directamente (atributo `capture`).
3. Confirmar una card crea el Gasto con la categoría elegida y aparece en la tabla y el dashboard.
4. Descartar una card no crea nada.
5. Tanda de 10 imágenes: responde dentro del timeout; 11 imágenes → error 400 claro.
6. Un archivo que no es imagen → 400 con mensaje, no 500.
7. Tests del parsing corren sin imágenes (strings de tickets) y cubren: total con `TOTAL`, total sin etiqueta, fecha en 3 formatos, ticket sin nada.
