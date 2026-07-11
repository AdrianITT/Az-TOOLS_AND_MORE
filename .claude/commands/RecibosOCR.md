# Escaneo de recibos con OCR — Gastos e Ingresos desde fotos

> **Estado:** Fases 1 y 2 implementadas, desplegadas y verificadas (2026-07-10). Hallazgos de implementación: (1) tesseract necesita `--psm 6` para tickets — sin eso separa etiquetas y montos en columnas; (2) el helper `static()` de Django devuelve `[]` con `DEBUG=False`, así que `/media/` nunca se sirvió en producción hasta ahora — corregido con `django.views.static.serve` explícito; (3) los comprobantes se exponen como URL **relativa** (`/media/…`) para funcionar igual desde LAN y Tailscale. Pendiente: Fase 3 (preprocesado OpenCV / sugerencia de categoría) solo si el acierto con tickets reales queda corto.

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

## Verificación cuando se implemente

1. Subir 3 fotos de tickets reales (uno nítido, uno regular, uno borroso) → el nítido llega con monto+fecha correctos, el borroso llega con confianza "baja" y campos vacíos, ninguno inventa datos.
2. Desde un teléfono en la red: el botón abre la cámara directamente (atributo `capture`).
3. Confirmar una card crea el Gasto con la categoría elegida y aparece en la tabla y el dashboard.
4. Descartar una card no crea nada.
5. Tanda de 10 imágenes: responde dentro del timeout; 11 imágenes → error 400 claro.
6. Un archivo que no es imagen → 400 con mensaje, no 500.
7. Tests del parsing corren sin imágenes (strings de tickets) y cubren: total con `TOTAL`, total sin etiqueta, fecha en 3 formatos, ticket sin nada.
