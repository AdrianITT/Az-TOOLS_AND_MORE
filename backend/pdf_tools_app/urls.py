from django.urls import path

from .views import (
    CompressPdfView,
    EditPagesView,
    ImagesToPdfView,
    InspectPdfView,
    MergePdfView,
    PdfToImagesView,
    PdfToWordView,
    ProtectPdfView,
    SplitPdfView,
    UnlockPdfView,
    WordToPdfView,
)

urlpatterns = [
    path('images-to-pdf/', ImagesToPdfView.as_view(), name='pdf-images-to-pdf'),
    path('merge/', MergePdfView.as_view(), name='pdf-merge'),
    path('word-to-pdf/', WordToPdfView.as_view(), name='pdf-word-to-pdf'),
    path('split/', SplitPdfView.as_view(), name='pdf-split'),
    path('pdf-to-images/', PdfToImagesView.as_view(), name='pdf-to-images'),
    path('edit-pages/inspect/', InspectPdfView.as_view(), name='pdf-edit-pages-inspect'),
    path('edit-pages/', EditPagesView.as_view(), name='pdf-edit-pages'),
    path('compress/', CompressPdfView.as_view(), name='pdf-compress'),
    path('protect/', ProtectPdfView.as_view(), name='pdf-protect'),
    path('unlock/', UnlockPdfView.as_view(), name='pdf-unlock'),
    path('pdf-to-word/', PdfToWordView.as_view(), name='pdf-to-word'),
]
