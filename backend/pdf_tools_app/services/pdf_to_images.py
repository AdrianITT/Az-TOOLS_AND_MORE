import io
import zipfile

import fitz  # pymupdf

from .exceptions import PdfToolError

DPI = 150
_ZOOM = DPI / 72

_FORMATS = {'png': 'png', 'jpg': 'jpeg', 'jpeg': 'jpeg'}


def pdf_to_images(file, image_format='png'):
    """Rasteriza cada página del PDF a una imagen y devuelve un .zip con
    los archivos resultantes (uno por página)."""
    fmt = _FORMATS.get(image_format.lower())
    if not fmt:
        raise PdfToolError(f'Formato de imagen no soportado: "{image_format}".')

    data = file.read()
    try:
        doc = fitz.open(stream=data, filetype='pdf')
    except Exception:
        raise PdfToolError(f'"{file.name}" no es un PDF válido o está dañado.')

    if doc.needs_pass:
        raise PdfToolError(f'"{file.name}" está protegido con contraseña.')
    if doc.page_count == 0:
        raise PdfToolError(f'"{file.name}" no tiene páginas.')

    matrix = fitz.Matrix(_ZOOM, _ZOOM)
    ext = 'jpg' if fmt == 'jpeg' else 'png'

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for index in range(doc.page_count):
            pix = doc[index].get_pixmap(matrix=matrix)
            image_bytes = pix.tobytes(fmt)
            zf.writestr(f'pagina_{index + 1}.{ext}', image_bytes)

    doc.close()
    zip_buffer.seek(0)
    return zip_buffer.getvalue()
