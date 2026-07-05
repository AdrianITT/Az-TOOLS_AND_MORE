# Pruebas de Flujo Completo — PDF → Word (sección 4 de `ListUpdata.MD`)

Fecha: 2026-07-05
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177`. Pruebas de API con `curl` y de UI con navegador real (Chromium vía Playwright), mismo enfoque que en los documentos anteriores.

## Causa raíz real (no era "contenido no convertible")

El servicio anterior (`backend/pdf_tools_app/services/pdf_to_word.py`) usaba `libreoffice --headless --convert-to docx`. Se investigó a fondo y se reprodujo el bug localmente (LibreOffice 24.2 instalado en el sistema):

1. **LibreOffice abre los PDF con su componente Draw, no Writer.** Al pedir `--convert-to docx` (o incluso `odt`/`txt`) sobre un PDF, LibreOffice responde `Error: no export filter for ... found, aborting.` con **exit code 0** — porque un documento Draw no tiene filtro de exportación a esos formatos. Se confirmó probando `--convert-to odt` y `--convert-to txt` sobre el mismo PDF: fallan exactamente igual, confirmando que el problema es el tipo de documento (Draw), no "contenido no convertible".
2. Como el código solo revisaba `returncode != 0` y la existencia del archivo de salida, este fallo estructural caía siempre en la rama `"No se generó el archivo Word. El PDF puede tener contenido no convertible."` — un mensaje engañoso, ya que ocurría con **cualquier PDF**, no solo con PDFs escaneados.
3. Adicionalmente, se confirmó un problema de **concurrencia**: correr dos conversiones de LibreOffice headless al mismo tiempo (sin perfil de usuario aislado) hace que compitan por el mismo perfil por defecto — en una prueba, un proceso abortó con el mismo error de filtro y el otro con `returncode 1`. Con gunicorn corriendo varios workers en producción, esto habría hecho fallar la conversión de forma intermitente incluso si el problema de Draw/Writer no existiera.

## Resolución aplicada

Se reemplazó la conversión por la librería **`pdf2docx`** (agregada a `requirements.txt`), que analiza el PDF directamente (vía PyMuPDF, ya usado en el proyecto) y reconstruye un `.docx` editable, sin depender de LibreOffice ni de subprocesos:

- Antes de convertir, se verifica con PyMuPDF si el PDF tiene texto seleccionable (`page.get_text()` en alguna página). Si no lo tiene (PDF escaneado/basado en imágenes), se lanza un error claro y específico: *"Este PDF no tiene texto seleccionable (parece ser un documento escaneado o basado en imágenes), por lo que no se puede convertir a un Word editable."*
- Si el archivo ni siquiera es un PDF válido, se captura la excepción de PyMuPDF y se informa: *"El archivo no es un PDF válido o está dañado."*
- Cualquier otra falla de `pdf2docx` se traduce a un mensaje con el detalle de la excepción, en vez de un 500 sin contexto.
- Se corrigió también el texto genérico de éxito compartido por todas las herramientas PDF (`PdfToolPage.jsx`), que decía "PDF generado y descargado correctamente" incluso para salidas `.docx`/`.zip`; ahora dice "Archivo generado y descargado correctamente".
- Se actualizó la descripción de la herramienta en el frontend (ya no menciona LibreOffice).

`libreoffice-writer` se mantiene en `backend/Dockerfile`, ya que `word_to_pdf.py` todavía lo usa para convertir archivos `.doc` legado a PDF (ese flujo es distinto y no se tocó).

## Pruebas realizadas

### Backend (`curl` directo)

| Caso | Antes del fix | Después del fix |
|---|---|---|
| PDF con texto normal (varias páginas, ~900 bytes) | `400`: "No se generó el archivo Word. El PDF puede tener contenido no convertible." (repro confirmada) | `200` — `.docx` válido (`Microsoft Word 2007+` según `file`), con el texto original preservado (verificado leyendo el `.docx` con `python-docx`) |
| Dos conversiones simultáneas (2 PDFs distintos, requests en paralelo) | Fallaban de forma intermitente por la contención de LibreOffice (repro confirmada por separado) | Ambas responden `200` con `.docx` válidos — ya no hay proceso externo con el que competir |
| PDF escaneado (imagen, sin texto) | Mismo mensaje engañoso que el caso normal | `400` con mensaje específico y correcto: "Este PDF no tiene texto seleccionable..." |
| Archivo corrupto (no es un PDF) | No probado en el original | `400`: "El archivo no es un PDF válido o está dañado." (se encontró y corrigió un 500 propio durante esta prueba: la verificación de texto no estaba dentro del `try/except`) |

### Frontend (navegador real, Chromium vía Playwright)

- Subir un PDF con texto normal → clic en "Convertir" → descarga automática de `documento.docx`, mensaje de éxito "Archivo generado y descargado correctamente."
- Subir un PDF escaneado → clic en "Convertir" → modal de error con el mensaje específico y claro (captura en el flujo), sin errores de JavaScript en consola.

## Bug propio encontrado y corregido durante la prueba

Al implementar el chequeo de texto seleccionable, la llamada a PyMuPDF (`fitz.open`) quedó fuera del bloque `try/except`, así que un archivo corrupto (no-PDF) causaba una excepción no capturada → `500` (página de debug de Django). Se corrigió envolviendo también esa verificación en su propio `try/except`, devolviendo un `PdfToolError` con mensaje claro en vez de un error de servidor.

## Limpieza

Los PDFs de prueba (texto normal, escaneado, corrupto) se generaron en el directorio de scratchpad de la sesión con PyMuPDF, no en el repositorio. `backend/.env` (copia temporal) y `backend/db.sqlite3` se eliminaron al finalizar; no se tocó el Postgres de producción. La dependencia `pdf2docx` (y sus sub-dependencias `opencv-python-headless`, `numpy`, `python-docx`, `fonttools`, `fire`) se instaló solo en el venv de prueba local; para producción hace falta reconstruir la imagen del backend (`docker compose build backend`) para que `pip install -r requirements.txt` la incluya.
