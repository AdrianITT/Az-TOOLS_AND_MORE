import io
import subprocess
import tempfile
import os

import mammoth
from pypdf import PdfWriter
from weasyprint import HTML

from .exceptions import PdfToolError


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


def _doc_to_pdf_bytes(f):
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f.name)
        with open(input_path, 'wb') as tmp:
            tmp.write(f.read())

        try:
            result = subprocess.run(
                ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', tmpdir, input_path],
                capture_output=True,
                timeout=60,
            )
        except subprocess.TimeoutExpired:
            raise PdfToolError(f'"{f.name}" tardó demasiado en convertirse. Intenta con un archivo más pequeño.')
        except FileNotFoundError:
            raise PdfToolError('LibreOffice no está instalado en el servidor.')

        if result.returncode != 0:
            raise PdfToolError(f'"{f.name}" no se pudo convertir: {result.stderr.decode()[:200]}')

        pdf_name = os.path.splitext(f.name)[0] + '.pdf'
        pdf_path = os.path.join(tmpdir, pdf_name)

        if not os.path.exists(pdf_path):
            raise PdfToolError(f'"{f.name}" no generó un PDF. Verifica que el archivo no esté dañado.')

        with open(pdf_path, 'rb') as pdf_file:
            return pdf_file.read()


def words_to_pdf(files):
    """Convierte una lista de documentos Word (.doc o .docx) en un único PDF.

    .docx: usa mammoth → HTML → weasyprint.
    .doc (formato legado): usa LibreOffice headless para la conversión.
    """
    if not files:
        raise PdfToolError('No se recibieron documentos para convertir.')

    writer = PdfWriter()
    for f in files:
        name_lower = f.name.lower()
        if name_lower.endswith('.docx'):
            pdf_bytes = _docx_to_pdf_bytes(f)
        elif name_lower.endswith('.doc'):
            pdf_bytes = _doc_to_pdf_bytes(f)
        else:
            raise PdfToolError(f'"{f.name}" no es un archivo Word válido. Se aceptan .doc y .docx.')

        writer.append(io.BytesIO(pdf_bytes))

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()
