import io

from pypdf import PdfReader, PdfWriter

from .exceptions import PdfToolError


def protect_pdf(file, password):
    try:
        reader = PdfReader(file)
        if reader.is_encrypted:
            raise PdfToolError('El PDF ya está protegido con contraseña.')
    except PdfToolError:
        raise
    except Exception:
        raise PdfToolError('No se pudo leer el PDF.')

    writer = PdfWriter()
    writer.clone_reader_document_root(reader)
    writer.encrypt(password)

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def unlock_pdf(file, password):
    try:
        reader = PdfReader(file)
    except Exception:
        raise PdfToolError('No se pudo leer el PDF.')

    if not reader.is_encrypted:
        raise PdfToolError('Este PDF no tiene contraseña.')

    result = reader.decrypt(password)
    if not result:
        raise PdfToolError('Contraseña incorrecta.')

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()
