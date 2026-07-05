import json
import re

from rest_framework import serializers

MAX_FILE_SIZE_MB = 25
MAX_FILES = 30

MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')
PDF_EXTENSIONS = ('.pdf',)
WORD_EXTENSIONS = ('.doc', '.docx')

_UNSAFE_NAME_CHARS = re.compile(r'[^A-Za-z0-9 _.\-]+')
_TRAILING_EXTENSION = re.compile(r'\.[A-Za-z0-9]{1,5}$')


def build_output_filename(raw_name, default_stem, ext):
    """Sanea un nombre de archivo dado por el usuario y le agrega la
    extensión correcta. Si no hay nombre válido, usa `default_stem`."""
    raw_name = (raw_name or '').strip()
    if raw_name:
        raw_name = _UNSAFE_NAME_CHARS.sub('', raw_name).strip()
        raw_name = _TRAILING_EXTENSION.sub('', raw_name).strip()
    return f'{raw_name or default_stem}.{ext}'


def _validate_files(files, extensions, min_files, kind_label):
    if not files:
        raise serializers.ValidationError('No se recibió ningún archivo.')
    if len(files) < min_files:
        raise serializers.ValidationError(
            f'Se requieren al menos {min_files} archivo(s) {kind_label}.'
        )
    if len(files) > MAX_FILES:
        raise serializers.ValidationError(f'No se pueden procesar más de {MAX_FILES} archivos.')

    for f in files:
        if f.size == 0:
            raise serializers.ValidationError(f'"{f.name}" está vacío.')
        if f.size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f'"{f.name}" supera el tamaño máximo de {MAX_FILE_SIZE_MB}MB.'
            )
        if not f.name.lower().endswith(extensions):
            raise serializers.ValidationError(
                f'"{f.name}" tiene un formato no soportado. Formatos permitidos: {", ".join(extensions)}.'
            )
    return files


class OutputNameMixin(serializers.Serializer):
    output_name = serializers.CharField(required=False, allow_blank=True, default='')


class ImagesToPdfSerializer(OutputNameMixin):
    files = serializers.ListField(
        child=serializers.FileField(), allow_empty=False,
    )

    def validate_files(self, files):
        return _validate_files(files, IMAGE_EXTENSIONS, min_files=1, kind_label='de imagen')


class MergePdfSerializer(OutputNameMixin):
    files = serializers.ListField(
        child=serializers.FileField(), allow_empty=False,
    )

    def validate_files(self, files):
        return _validate_files(files, PDF_EXTENSIONS, min_files=2, kind_label='PDF')


class WordToPdfSerializer(OutputNameMixin):
    files = serializers.ListField(
        child=serializers.FileField(), allow_empty=False,
    )

    def validate_files(self, files):
        return _validate_files(files, WORD_EXTENSIONS, min_files=1, kind_label='Word')


class SplitPdfSerializer(OutputNameMixin):
    file = serializers.FileField()
    ranges = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]


class InspectPdfSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]


class EditPagesSerializer(OutputNameMixin):
    file = serializers.FileField()
    operations = serializers.CharField()

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]

    def validate_operations(self, value):
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('El campo "operations" debe ser JSON válido.')
        if not isinstance(parsed, list) or not parsed:
            raise serializers.ValidationError('No quedan páginas para generar el PDF.')
        for op in parsed:
            if not isinstance(op, dict) or 'page' not in op:
                raise serializers.ValidationError('Cada operación debe incluir el número de página.')
        return parsed


class PdfToImagesSerializer(OutputNameMixin):
    file = serializers.FileField()
    format = serializers.ChoiceField(choices=['png', 'jpg'], required=False, default='png')

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]


class CompressPdfSerializer(OutputNameMixin):
    file = serializers.FileField()

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]


class ProtectPdfSerializer(OutputNameMixin):
    file = serializers.FileField()
    password = serializers.CharField(min_length=1)

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]


class UnlockPdfSerializer(OutputNameMixin):
    file = serializers.FileField()
    password = serializers.CharField(min_length=1)

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]


class PdfToWordSerializer(OutputNameMixin):
    file = serializers.FileField()

    def validate_file(self, f):
        return _validate_files([f], PDF_EXTENSIONS, min_files=1, kind_label='PDF')[0]
