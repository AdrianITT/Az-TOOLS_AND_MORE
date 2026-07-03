import io
import zipfile

from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

from .exceptions import PdfToolError


def _parse_ranges(ranges_str, page_count):
    """Convierte "1-3,5,7-8" en una lista de tuplas (inicio, fin), 0-indexadas e inclusivas."""
    ranges = []
    for chunk in ranges_str.split(','):
        chunk = chunk.strip()
        if not chunk:
            continue
        if '-' in chunk:
            start_str, end_str = chunk.split('-', 1)
        else:
            start_str = end_str = chunk

        try:
            start, end = int(start_str), int(end_str)
        except ValueError:
            raise PdfToolError(f'Rango de páginas inválido: "{chunk}".')

        if start < 1 or end < start or end > page_count:
            raise PdfToolError(
                f'Rango de páginas inválido: "{chunk}" (el documento tiene {page_count} páginas).'
            )
        ranges.append((start - 1, end - 1))

    if not ranges:
        raise PdfToolError('No se especificó ningún rango de páginas válido.')
    return ranges


def split_pdf(file, ranges_str=None):
    """Divide un PDF en varios archivos.

    Si `ranges_str` viene vacío, genera un PDF por cada página. Si se
    especifica (p.ej. "1-3,4-6"), genera un PDF por cada rango indicado.
    Devuelve los bytes de un .zip con los PDFs resultantes.
    """
    try:
        reader = PdfReader(file)
    except PdfReadError:
        raise PdfToolError(f'"{file.name}" no es un PDF válido o está dañado.')

    if reader.is_encrypted:
        raise PdfToolError(f'"{file.name}" está protegido con contraseña.')

    page_count = len(reader.pages)
    if page_count == 0:
        raise PdfToolError(f'"{file.name}" no tiene páginas.')

    if ranges_str:
        ranges = _parse_ranges(ranges_str, page_count)
    else:
        ranges = [(i, i) for i in range(page_count)]

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for idx, (start, end) in enumerate(ranges, start=1):
            writer = PdfWriter()
            for page_index in range(start, end + 1):
                writer.add_page(reader.pages[page_index])

            part_buffer = io.BytesIO()
            writer.write(part_buffer)

            if start == end:
                name = f'pagina_{start + 1}.pdf'
            else:
                name = f'paginas_{start + 1}-{end + 1}.pdf'
            zf.writestr(name, part_buffer.getvalue())

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
