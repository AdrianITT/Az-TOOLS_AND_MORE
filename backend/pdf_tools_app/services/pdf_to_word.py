import io

import fitz
from pdf2docx import Converter

from .exceptions import PdfToolError


def _tiene_texto_seleccionable(file_bytes):
    with fitz.open(stream=file_bytes, filetype='pdf') as doc:
        return any(page.get_text().strip() for page in doc)


def pdf_to_word(file):
    """Convierte un PDF a un .docx editable usando pdf2docx.

    Antes se usaba `libreoffice --headless --convert-to docx`, pero LibreOffice
    abre los PDF con su componente Draw (no Writer), que no tiene filtro de
    exportación a docx/odt/txt: la conversión fallaba con exit code 0 y sin
    generar archivo, y bajo carga concurrente (varios workers de gunicorn)
    los procesos de LibreOffice competían por el mismo perfil de usuario. Esto
    hacía que "no se pudo convertir" apareciera incluso con PDFs de texto normal.
    """
    file_bytes = file.read()

    try:
        tiene_texto = _tiene_texto_seleccionable(file_bytes)
    except Exception:
        raise PdfToolError('El archivo no es un PDF válido o está dañado.')

    if not tiene_texto:
        raise PdfToolError(
            'Este PDF no tiene texto seleccionable (parece ser un documento escaneado o basado '
            'en imágenes), por lo que no se puede convertir a un Word editable.'
        )

    try:
        converter = Converter(stream=file_bytes)
        try:
            buffer = io.BytesIO()
            converter.convert(buffer)
        finally:
            converter.close()
    except Exception as exc:
        raise PdfToolError(f'No se pudo convertir el PDF a Word: {exc}')

    buffer.seek(0)
    return buffer.read()
