# Pruebas de Flujo Completo — Comprimir PDF (sección 5 de `ListUpdata.MD`)

Fecha: 2026-07-05
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177`. Pruebas de API con `curl` y de UI con navegador real (Chromium vía Playwright).

## Causa raíz real (dos bugs, no "librería faltante")

El relevamiento inicial especulaba que el 500 se debía a una dependencia externa faltante (ej. Ghostscript) en el contenedor. **Falso**: `compress_pdf.py` nunca usó Ghostscript, solo `pypdf` puro Python. Se encontraron dos bugs reales en `backend/pdf_tools_app/services/compress_pdf.py`:

### Bug #1 (el principal — afectaba a TODOS los PDFs, no solo casos raros)

El código llamaba `page.compress_content_streams()` **antes** de agregar la página al `PdfWriter`:

```python
writer = PdfWriter()
for page in reader.pages:
    page.compress_content_streams()   # <- la página todavía pertenece al reader
    writer.add_page(page)
```

Con `pypdf==6.14.2`, `compress_content_streams()` requiere que la página ya pertenezca a un `PdfWriter`. Se reprodujo localmente contra 3 PDFs distintos (texto simple, con imágenes, escaneado): **los 3 fallaban** con `ValueError: Page must be part of a PdfWriter`, sin excepción, sin importar el contenido del PDF. Esto explica por qué el reporte original decía que compress "siempre" daba 500 — es estructural, no depende del archivo.

### Bug #2 (caso real adicional: PDFs protegidos con contraseña)

Incluso corrigiendo el orden, un PDF ya protegido con contraseña (`reader.is_encrypted = True`) revienta al iterar `reader.pages` con `FileNotDecryptedError`, una excepción que ocurría **fuera** del único `try/except` del código original (que solo envolvía la construcción de `PdfReader(file)`). Se reprodujo generando un PDF cifrado con `pypdf` y confirmando la excepción exacta.

## Resolución aplicada

En `compress_pdf.py`:
- Se corrigió el orden: primero `writer.add_page(page)` para todas las páginas, y **después** `page.compress_content_streams()` iterando `writer.pages` (no `reader.pages`).
- Se envolvió todo el pipeline de compresión (no solo la lectura inicial) en `try/except`, capturando `pypdf.errors.FileNotDecryptedError` con un mensaje específico y accionable: *"Este PDF está protegido con contraseña. Quítale la protección (herramienta 'Desbloquear PDF') antes de comprimirlo."*
- Cualquier otra excepción durante la compresión se traduce a un mensaje con el detalle, en vez de un 500 sin contexto.

## Pruebas realizadas

### Backend (`curl` directo)

| Caso | Antes del fix | Después del fix |
|---|---|---|
| PDF de texto normal | `500` (repro confirmada: `ValueError: Page must be part of a PdfWriter`) | `200` — PDF comprimido válido devuelto |
| PDF con imágenes (~6.4MB) | `500` (mismo bug estructural) | `200` — PDF válido devuelto |
| PDF protegido con contraseña | `500` (repro confirmada: `FileNotDecryptedError` sin capturar) | `400` con mensaje claro y accionable |
| Archivo corrupto (no es un PDF) | `400` (ya funcionaba, sin cambios) | `400` (sin cambios) |

### Frontend (navegador real, Chromium vía Playwright)

- Subir PDF normal → clic en "Comprimir" → descarga automática de `comprimido.pdf`, sin errores de consola.
- Subir PDF protegido con contraseña → clic en "Comprimir" → modal de error con el mensaje específico ("protegido con contraseña... herramienta Desbloquear PDF"), sin errores de JavaScript.

## Limitación conocida (no es un bug, documentado para expectativas realistas)

`compress_content_streams()` de pypdf solo recomprime los *content streams* (los operadores de dibujo/texto de la página), **no** recodifica ni recomprime imágenes embebidas. En el PDF de prueba dominado por imágenes (~6.4MB), la reducción de tamaño fue mínima (<1%). Para PDFs cuyo peso es mayormente imágenes de alta resolución —el caso más común de "PDF pesado" en la práctica—, esta herramienta no logrará una reducción significativa. Si se quiere compresión real de imágenes, se necesitaría re-encodear las imágenes embebidas (por ejemplo bajando su resolución/calidad JPEG) o usar Ghostscript — eso sí sería una mejora nueva, no el fix del bug reportado, y se deja fuera de alcance de esta tarea.

## Limpieza

PDFs de prueba (texto normal, con imágenes, cifrado, corrupto) generados en el directorio de scratchpad de la sesión, no en el repositorio. `backend/.env` (copia temporal) y `backend/db.sqlite3` eliminados al finalizar; no se tocó el Postgres de producción.
