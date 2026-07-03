import io

import mammoth
from pypdf import PdfWriter
from weasyprint import HTML

from .exceptions import PdfToolError

_DOCX_MIMES = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}


def _docx_to_pdf_bytes(f):
    try:
        result = mammoth.convert_to_html(f)
    except Exception:
        raise PdfToolError(f'"{f.name}" no se pudo leer. Verifica que sea un .docx válido.')

    html = f'<html><body>{result.value}</body></html>'
    buffer = io.BytesIO()
    HTML(string=html).write_pdf(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def words_to_pdf(files):
    """Convierte una lista ordenada de documentos Word (.docx) en un único PDF.

    Cada documento se renderiza vía mammoth (docx -> HTML) y weasyprint
    (HTML -> PDF), preservando el orden, y luego se combinan las páginas.
    No soporta el formato legado .doc: requiere .docx.
    """
    if not files:
        raise PdfToolError('No se recibieron documentos para convertir.')

    writer = PdfWriter()
    for f in files:
        if f.name.lower().endswith('.doc') and not f.name.lower().endswith('.docx'):
            raise PdfToolError(
                f'"{f.name}" tiene formato .doc antiguo, no soportado. Guarda el archivo como .docx e inténtalo de nuevo.'
            )
        pdf_bytes = _docx_to_pdf_bytes(f)
        writer.append(io.BytesIO(pdf_bytes))

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()
