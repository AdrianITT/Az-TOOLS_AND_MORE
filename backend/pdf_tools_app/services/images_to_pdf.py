import io

from PIL import Image, UnidentifiedImageError

from .exceptions import PdfToolError


def images_to_pdf(files):
    """Convierte una lista ordenada de archivos de imagen en un único PDF.

    `files` es una lista de archivos tipo Django UploadedFile, ya en el
    orden final deseado. Devuelve los bytes del PDF resultante.
    """
    pages = []
    for f in files:
        try:
            img = Image.open(f)
            img.load()
        except UnidentifiedImageError:
            raise PdfToolError(f'"{f.name}" no es una imagen válida.')

        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')
        pages.append(img)

    if not pages:
        raise PdfToolError('No se recibieron imágenes para convertir.')

    buffer = io.BytesIO()
    first, rest = pages[0], pages[1:]
    first.save(buffer, format='PDF', save_all=True, append_images=rest)
    buffer.seek(0)
    return buffer.getvalue()
