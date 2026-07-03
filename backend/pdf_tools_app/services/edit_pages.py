import base64
import io

import fitz  # pymupdf
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

from .exceptions import PdfToolError

THUMBNAIL_ZOOM = 0.3


def inspect_pdf(file):
    """Devuelve una miniatura (PNG base64) por cada página del PDF, para que
    el frontend arme un editor de páginas (reordenar / rotar / eliminar)."""
    data = file.read()
    try:
        doc = fitz.open(stream=data, filetype='pdf')
    except Exception:
        raise PdfToolError(f'"{file.name}" no es un PDF válido o está dañado.')

    if doc.needs_pass:
        raise PdfToolError(f'"{file.name}" está protegido con contraseña.')

    pages = []
    matrix = fitz.Matrix(THUMBNAIL_ZOOM, THUMBNAIL_ZOOM)
    for index in range(doc.page_count):
        pix = doc[index].get_pixmap(matrix=matrix)
        thumbnail_b64 = base64.b64encode(pix.tobytes('png')).decode('ascii')
        pages.append({'page': index + 1, 'thumbnail': thumbnail_b64})

    doc.close()
    return pages


def edit_pdf_pages(file, operations):
    """Reconstruye un PDF a partir de una lista ordenada de operaciones
    `[{page: <n° de página original, 1-indexada>, rotate: 0|90|180|270}, ...]`.

    El orden de `operations` define el orden final; páginas del original que
    no aparecen en `operations` quedan eliminadas.
    """
    try:
        reader = PdfReader(file)
    except PdfReadError:
        raise PdfToolError(f'"{file.name}" no es un PDF válido o está dañado.')

    if reader.is_encrypted:
        raise PdfToolError(f'"{file.name}" está protegido con contraseña.')

    page_count = len(reader.pages)
    if not operations:
        raise PdfToolError('No quedan páginas para generar el PDF.')

    writer = PdfWriter()
    for op in operations:
        page_number = op.get('page')
        rotate = op.get('rotate', 0)

        if not isinstance(page_number, int) or page_number < 1 or page_number > page_count:
            raise PdfToolError(f'Número de página inválido: {page_number}.')
        if rotate not in (0, 90, 180, 270):
            raise PdfToolError(f'Rotación inválida: {rotate}.')

        page = reader.pages[page_number - 1]
        if rotate:
            page = page.rotate(rotate)
        writer.add_page(page)

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()
