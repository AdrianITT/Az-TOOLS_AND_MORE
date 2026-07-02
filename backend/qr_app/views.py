import io
import qrcode
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.core.mail import EmailMessage

from cotizador_project.mixins import OrganizationFilterMixin
from cotizador_project.permissions import HasRolPermission
from cotizador_project.models import Cotizacion
from .models import CodigoQR
from .serializers import CodigoQRSerializer, GenerarQRSerializer


def generar_qr_png(url_data, color_fg='#000000', color_bg='#FFFFFF'):
    """Genera PNG de QR desde URL"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(url_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=color_fg, back_color=color_bg)
    png_buffer = io.BytesIO()
    img.save(png_buffer, format='PNG')
    png_buffer.seek(0)
    return png_buffer.getvalue()


class CodigoQRViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Códigos QR personalizados"""

    queryset = CodigoQR.objects.all()
    serializer_class = CodigoQRSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    search_fields = ['titulo', 'url_data']
    ordering_fields = ['creado', 'descargado_veces']
    ordering = ['-creado']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )

    @action(detail=False, methods=['post'])
    def generar(self, request):
        """Genera QR on-the-fly sin guardar"""
        serializer = GenerarQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        png_data = generar_qr_png(
            serializer.validated_data['url_data'],
            serializer.validated_data['color_fg'],
            serializer.validated_data['color_bg'],
        )

        cotizacion_id = serializer.validated_data.get('cotizacion')
        cotizacion = None
        if cotizacion_id:
            cotizacion = Cotizacion.objects.filter(
                id=cotizacion_id, organization=request.user.organization,
            ).first()
            if cotizacion is None:
                return Response(
                    {'error': 'La cotización indicada no existe en tu organización'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Si solicita guardar
        if serializer.validated_data.get('guardar'):
            qr = CodigoQR.objects.create(
                organization=request.user.organization,
                titulo=serializer.validated_data.get('titulo', 'Sin título'),
                url_data=serializer.validated_data['url_data'],
                png_data=png_data,
                color_fg=serializer.validated_data['color_fg'],
                color_bg=serializer.validated_data['color_bg'],
                forma=serializer.validated_data['forma'],
                cotizacion=cotizacion,
                creado_por=request.user,
            )
            return Response(CodigoQRSerializer(qr).data, status=status.HTTP_201_CREATED)

        # Si no guarda, solo retorna PNG en base64
        import base64
        return Response({
            'png_base64': base64.b64encode(png_data).decode('utf-8'),
            'url_data': serializer.validated_data['url_data'],
        })

    @action(detail=True, methods=['get'])
    def descarga(self, request, pk=None):
        """Descarga PNG del QR"""
        qr = self.get_object()
        qr.descargado_veces += 1
        qr.save(update_fields=['descargado_veces'])

        return FileResponse(
            io.BytesIO(qr.png_data),
            as_attachment=True,
            filename=f"{qr.titulo}.png",
            content_type='image/png',
        )

    @action(detail=True, methods=['post'])
    def compartir(self, request, pk=None):
        """Comparte QR por email"""
        qr = self.get_object()
        email = request.data.get('email')

        if not email:
            return Response({'error': 'email es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            msg = EmailMessage(
                subject=f'Código QR: {qr.titulo}',
                body=f'Te comparten el código QR: {qr.titulo}\n\nURL: {qr.url_data}',
                from_email='noreply@example.com',
                to=[email],
            )
            msg.attach(f'{qr.titulo}.png', qr.png_data, 'image/png')
            msg.send()
            return Response({'success': True, 'message': f'QR compartido a {email}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
