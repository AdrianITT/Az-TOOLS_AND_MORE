import io

from pypdf import PdfReader, PdfWriter
from pypdf.errors import FileNotDecryptedError

from .exceptions import PdfToolError


def compress_pdf(file):
    try:
        reader = PdfReader(file)
    except Exception:
        raise PdfToolError('No se pudo leer el PDF. Verifica que no esté dañado.')

    try:
        writer = PdfWriter()
        # Las páginas deben pertenecer al writer antes de comprimir sus content
        # streams; llamar compress_content_streams() sobre la página del reader
        # (como se hacía antes) falla con "Page must be part of a PdfWriter".
        for page in reader.pages:
            writer.add_page(page)
        for page in writer.pages:
            page.compress_content_streams()

        if reader.metadata:
            writer.add_metadata(dict(reader.metadata))

        buffer = io.BytesIO()
        writer.write(buffer)
    except FileNotDecryptedError:
        raise PdfToolError(
            'Este PDF está protegido con contraseña. Quítale la protección '
            '(herramienta "Desbloquear PDF") antes de comprimirlo.'
        )
    except Exception as exc:
        raise PdfToolError(f'No se pudo comprimir el PDF: {exc}')

    buffer.seek(0)
    return buffer.getvalue()
