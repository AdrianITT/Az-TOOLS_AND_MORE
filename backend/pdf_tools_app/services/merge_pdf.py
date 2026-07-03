import io

from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

from .exceptions import PdfToolError


def merge_pdfs(files):
    """Une una lista ordenada de archivos PDF en un único documento."""
    writer = PdfWriter()

    for f in files:
        try:
            reader = PdfReader(f)
        except PdfReadError:
            raise PdfToolError(f'"{f.name}" no es un PDF válido o está dañado.')

        if reader.is_encrypted:
            raise PdfToolError(f'"{f.name}" está protegido con contraseña.')

        for page in reader.pages:
            writer.add_page(page)

    if len(writer.pages) == 0:
        raise PdfToolError('No se recibieron páginas para unir.')

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()
