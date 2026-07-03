import io

from django.http import FileResponse, JsonResponse
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    EditPagesSerializer,
    ImagesToPdfSerializer,
    InspectPdfSerializer,
    MergePdfSerializer,
    PdfToImagesSerializer,
    SplitPdfSerializer,
    WordToPdfSerializer,
    build_output_filename,
)
from .services.edit_pages import edit_pdf_pages, inspect_pdf
from .services.exceptions import PdfToolError
from .services.images_to_pdf import images_to_pdf
from .services.merge_pdf import merge_pdfs
from .services.pdf_to_images import pdf_to_images
from .services.split_pdf import split_pdf
from .services.word_to_pdf import words_to_pdf


class BasePdfToolView(APIView):
    """Vista base para herramientas PDF sin estado: recibe archivos, delega
    la lógica a un servicio y devuelve el resultado como descarga."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    serializer_class = None
    default_stem = 'resultado'
    output_ext = 'pdf'
    output_content_type = 'application/pdf'

    def get_files(self, validated_data):
        raise NotImplementedError

    def call_service(self, validated_data):
        raise NotImplementedError

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result_bytes = self.call_service(serializer.validated_data)
        except PdfToolError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        filename = build_output_filename(
            serializer.validated_data.get('output_name', ''), self.default_stem, self.output_ext,
        )
        return FileResponse(
            io.BytesIO(result_bytes),
            as_attachment=True,
            filename=filename,
            content_type=self.output_content_type,
        )


class ImagesToPdfView(BasePdfToolView):
    serializer_class = ImagesToPdfSerializer
    default_stem = 'imagenes'

    def call_service(self, data):
        return images_to_pdf(data['files'])


class MergePdfView(BasePdfToolView):
    serializer_class = MergePdfSerializer
    default_stem = 'unido'

    def call_service(self, data):
        return merge_pdfs(data['files'])


class WordToPdfView(BasePdfToolView):
    serializer_class = WordToPdfSerializer
    default_stem = 'documento'

    def call_service(self, data):
        return words_to_pdf(data['files'])


class SplitPdfView(BasePdfToolView):
    serializer_class = SplitPdfSerializer
    default_stem = 'dividido'
    output_ext = 'zip'
    output_content_type = 'application/zip'

    def call_service(self, data):
        return split_pdf(data['file'], data.get('ranges') or None)


class EditPagesView(BasePdfToolView):
    serializer_class = EditPagesSerializer
    default_stem = 'editado'

    def call_service(self, data):
        return edit_pdf_pages(data['file'], data['operations'])


class PdfToImagesView(BasePdfToolView):
    serializer_class = PdfToImagesSerializer
    default_stem = 'imagenes'
    output_ext = 'zip'
    output_content_type = 'application/zip'

    def call_service(self, data):
        return pdf_to_images(data['file'], data.get('format', 'png'))


class InspectPdfView(APIView):
    """Devuelve miniaturas de cada página para armar el editor de páginas."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        serializer = InspectPdfSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            pages = inspect_pdf(serializer.validated_data['file'])
        except PdfToolError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return JsonResponse({'pages': pages})
