# Pruebas de Flujo Completo — Personalización avanzada de Código QR (sección 7 de `ListUpdata.MD`)

Fecha: 2026-07-05
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177`. Pruebas de API con `curl` y de UI con navegador real (Chromium vía Playwright).

## Decisión de arquitectura (investigación previa a implementar)

El documento pedía investigar librerías (mencionaba **qr-code-styling**, JS) y decidir entre editor visual en frontend (Canvas en tiempo real) o extender el backend, "seleccionando la opción que mejor se adapte a la arquitectura ya existente (generación server-side)".

Se investigó la librería **`qrcode` (Python, ya era dependencia del proyecto, versión 8.2)** antes de considerar agregar una dependencia JS nueva, y resultó tener soporte nativo para prácticamente todo lo pedido:
- `module_drawer`: forma de los módulos (`SquareModuleDrawer`, `RoundedModuleDrawer`, `CircleModuleDrawer`, `GappedSquareModuleDrawer`, `HorizontalBarsDrawer`, `VerticalBarsDrawer`).
- `eye_drawer`: forma de los "ojos" (las 3 esquinas), **independiente** del `module_drawer` — esto no era evidente en la documentación de alto nivel de la librería y se confirmó leyendo el código fuente (`qrcode.image.base.BaseImageWithDrawer`, método `is_eye()`).
- `color_mask`: degradados (`RadialGradiantColorMask`, `SquareGradiantColorMask`, `HorizontalGradiantColorMask`, `VerticalGradiantColorMask`) además de color sólido.
- `embedded_image`: logo al centro (el modelo `CodigoQR` ya tenía un campo `logo` desde antes, pero nunca se usaba en la generación real).
- `border`: margen.

**Se decidió mantener la generación 100% server-side** (sin agregar ninguna librería JS ni mover lógica al frontend), ya que la librería existente cubre el pedido casi por completo y esto respeta la arquitectura actual (galería de QRs guardados, envío por email, conteo de descargas — todo depende de tener el PNG ya generado en el backend). Se verificó con `cv2.QRCodeDetector` que el QR resultante **sigue siendo escaneable** con módulos/ojos personalizados y logo embebido (usando nivel de corrección de errores H cuando hay logo).

## Cambios aplicados

### Backend

- **`qr_app/models.py`**: `CodigoQR.FORMA_CHOICES` ampliado (square/rounded/circle/gapped_square/horizontal_bars/vertical_bars); nuevos campos `forma_ojos`, `gradiente_tipo`, `color_gradiente`, `margen`. Migración `0003_codigoqr_color_gradiente_codigoqr_forma_ojos_and_more`.
- **`qr_app/services/qr_render.py`** (nuevo): `render_qr_png()` (estilo completo vía `qrcode` + PIL), `render_qr_svg()` (vectorial, color sólido y forma básica — ver limitación abajo), `render_qr_pdf()` (envuelve el PNG estilizado en un PDF de una página usando `weasyprint`, ya dependencia del proyecto — sin librerías nuevas).
- **`qr_app/serializers.py`**: `GenerarQRSerializer` ampliado con `forma_ojos`, `gradiente_tipo`, `color_gradiente`, `margen`, `logo` (upload), `formato` (png/svg/pdf); validación cruzada (degradado requiere color de degradado).
- **`qr_app/views.py`**:
  - `generar` (preview + guardar opcional): ahora usa el servicio de render con todos los parámetros de estilo.
  - **Nueva acción `descargar`** (`POST /qr/codigos/descargar/`): genera y devuelve el archivo binario (png/svg/pdf) de un QR **sin guardar**, para el botón de descarga directa desde el preview.
  - `descarga` (QR ya guardado, `GET /qr/codigos/<id>/descarga/?formato=`): ahora soporta `formato` — PNG se sirve directo desde `png_data` (ya generado), SVG/PDF se re-renderizan on-demand con los parámetros de estilo guardados.

### Frontend (`QR.jsx`)

- Formulario "Generar" ampliado: forma de módulos, forma de ojos, tipo de degradado + color, margen, subida de logo (con preview y botón "Quitar"), selector de formato de descarga.
- Botón "Descargar {FORMATO}" para bajar el preview sin necesidad de guardarlo primero.
- "Mis QRs"/"Galería": selector de formato por fila junto al botón de descarga existente.
- Se reemplazó `api.post` (que solo maneja JSON) por `fetch` con `FormData` para las llamadas que necesitan subir el logo, siguiendo el mismo patrón ya usado en `Organizacion.jsx`.

## Bug de diseño propio, encontrado y corregido antes de terminar

En una primera versión, el endpoint `generar` cambiaba su tipo de respuesta según `formato` (JSON con `png_base64` para PNG, binario para SVG/PDF), pero el flujo de "preview" del frontend siempre espera JSON. Esto se detectó probando `formato=svg` contra `/generar/` y notando que igual devolvía JSON. Se corrigió separando responsabilidades: `/generar/` **siempre** devuelve JSON (preview), y se agregó la acción dedicada `/descargar/` que siempre devuelve el binario — sin ambigüedad de contrato por endpoint.

## Pruebas realizadas

### Backend (`curl`)
- `POST /qr/codigos/generar/` con `forma=rounded`, `forma_ojos=circle`, `gradiente_tipo=radial`, sin `formato` relevante → JSON con `png_base64` correcto.
- `POST /qr/codigos/descargar/` con `formato=svg` → `200`, `Content-Type: image/svg+xml`, SVG válido.
- `POST /qr/codigos/descargar/` con `formato=pdf` → `200`, `Content-Type: application/pdf`, PDF válido (verificado con `file`).
- `POST /qr/codigos/generar/` con `guardar=true`, logo adjunto (`multipart/form-data`), forma/ojos/degradado → `201`, QR guardado con todos los campos correctos y logo almacenado en `/media/qr_logos/`.
- `GET /qr/codigos/<id>/descarga/?formato=pdf` (QR ya guardado) → re-renderiza con el estilo guardado, `200`, PDF válido; contador `descargado_veces` se incrementa correctamente.
- **Legibilidad**: se decodificó con `cv2.QRCodeDetector` el PNG con forma/ojos/degradado/logo combinados → el contenido (`url_data`) se lee correctamente. También se verificó el SVG rasterizado.

### Frontend (navegador real, Chromium vía Playwright)
- Formulario completo (forma, ojos, degradado, color de degradado, margen, logo) → "Generar Preview" → imagen mostrada correctamente con todos los estilos aplicados.
- Botón "Descargar SVG" (sin guardar) → descarga de archivo `.svg` exitosa.
- "Guardar QR" (tras generar preview) → aparece correctamente en "Mis QRs" con su preview, selector de formato y botón de descarga por fila.
- Sin errores de consola en ningún paso.

## Limitaciones documentadas (decisiones conscientes, no bugs)

1. **SVG no soporta degradado, ojos personalizados ni logo** — solo color sólido y forma básica de módulo (círculo/cuadrado con espacio). La librería `qrcode` solo soporta el sistema completo de `module_drawer`/`eye_drawer`/`color_mask` para salidas rasterizadas (PIL); el exportador SVG de la librería es más limitado. Se documenta como limitación conocida: PNG es el formato recomendado para diseños personalizados; SVG sirve para casos que necesiten vector con color de marca simple.
2. **No hay editor visual tipo Canvas en tiempo real** — se mantuvo el patrón existente de botón explícito "Generar Preview" (igual que antes de este cambio), en vez de recalcular en cada tecleo. Justificación: la generación es server-side por decisión de arquitectura (ver arriba), así que un "tiempo real" verdadero implicaría llamadas de red constantes; se prefirió mantener el patrón ya establecido en la UI en lugar de introducir debounce/cancelación de requests, que habría sido una ampliación de alcance no solicitada explícitamente.

## Limpieza

Los QRs de prueba, logo de prueba, y archivos generados (PNG/SVG/PDF) se generaron en el directorio de scratchpad de la sesión. `backend/.env` (copia temporal) y `backend/db.sqlite3` se eliminaron al finalizar; no se tocó el Postgres de producción. La migración `0003_...` sí quedó en el repositorio (es necesaria para producción).
