import base64
import io

from django.core.mail import EmailMessage
from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cotizador_project.mixins import OrganizationFilterMixin
from cotizador_project.models import Cotizacion
from cotizador_project.permissions import HasRolPermission
from .models import CodigoQR
from .serializers import CodigoQRSerializer, GenerarQRSerializer
from .services.qr_render import render_qr_pdf, render_qr_png, render_qr_svg

FORMATO_CONTENT_TYPES = {
    'png': 'image/png',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
}


def _render_estilo_kwargs(data):
    """Extrae del payload validado los kwargs de estilo comunes a las 3 funciones de render."""
    return dict(
        color_fg=data['color_fg'],
        color_bg=data['color_bg'],
        forma=data['forma'],
        forma_ojos=data.get('forma_ojos', data['forma']),
        gradiente_tipo=data.get('gradiente_tipo', 'none'),
        color_gradiente=data.get('color_gradiente') or None,
        margen=data.get('margen', 4),
        logo_file=data.get('logo'),
    )


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
        """Genera un preview (PNG en base64) y, opcionalmente, lo guarda.

        Siempre responde JSON con `png_base64` para mostrar la vista previa en
        pantalla; el campo `formato` no aplica acá (ver la acción `descargar`
        para obtener directamente el archivo binario en png/svg/pdf).
        """
        serializer = GenerarQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        estilo = _render_estilo_kwargs(data)

        try:
            png_data = render_qr_png(data['url_data'], **estilo)
        except Exception as exc:
            return Response({'error': f'No se pudo generar el QR: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        cotizacion_id = data.get('cotizacion')
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

        if data.get('guardar'):
            qr = CodigoQR.objects.create(
                organization=request.user.organization,
                titulo=data.get('titulo', 'Sin título'),
                url_data=data['url_data'],
                png_data=png_data,
                color_fg=data['color_fg'],
                color_bg=data['color_bg'],
                forma=data['forma'],
                forma_ojos=data.get('forma_ojos', data['forma']),
                gradiente_tipo=data.get('gradiente_tipo', 'none'),
                color_gradiente=data.get('color_gradiente') or '',
                margen=data.get('margen', 4),
                logo=data.get('logo'),
                cotizacion=cotizacion,
                creado_por=request.user,
            )
            return Response(CodigoQRSerializer(qr).data, status=status.HTTP_201_CREATED)

        return Response({
            'png_base64': base64.b64encode(png_data).decode('utf-8'),
            'url_data': data['url_data'],
        })

    @action(detail=False, methods=['post'])
    def descargar(self, request):
        """Genera un QR sin guardar y lo devuelve como archivo binario (png/svg/pdf),
        para el botón de descarga directa del preview antes de guardar."""
        serializer = GenerarQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        estilo = _render_estilo_kwargs(data)
        formato = data['formato']

        try:
            if formato == 'svg':
                contenido = render_qr_svg(
                    data['url_data'], color_fg=estilo['color_fg'], color_bg=estilo['color_bg'],
                    forma=estilo['forma'], margen=estilo['margen'],
                )
            elif formato == 'pdf':
                contenido = render_qr_pdf(data['url_data'], **estilo)
            else:
                contenido = render_qr_png(data['url_data'], **estilo)
        except Exception as exc:
            return Response({'error': f'No se pudo generar el QR: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        titulo = data.get('titulo') or 'qr'
        return FileResponse(
            io.BytesIO(contenido),
            as_attachment=True,
            filename=f"{titulo}.{formato}",
            content_type=FORMATO_CONTENT_TYPES[formato],
        )

    @action(detail=True, methods=['get'])
    def descarga(self, request, pk=None):
        """Descarga el QR guardado en el formato pedido (?formato=png|svg|pdf, default png)"""
        qr = self.get_object()
        formato = request.query_params.get('formato', 'png')
        if formato not in FORMATO_CONTENT_TYPES:
            return Response({'error': 'Formato inválido. Usa png, svg o pdf.'}, status=status.HTTP_400_BAD_REQUEST)

        estilo = dict(
            color_fg=qr.color_fg, color_bg=qr.color_bg, forma=qr.forma,
            forma_ojos=qr.forma_ojos, gradiente_tipo=qr.gradiente_tipo,
            color_gradiente=qr.color_gradiente or None, margen=qr.margen,
            logo_file=qr.logo if qr.logo else None,
        )

        if formato == 'png':
            contenido = qr.png_data
        elif formato == 'svg':
            contenido = render_qr_svg(
                qr.url_data, color_fg=estilo['color_fg'], color_bg=estilo['color_bg'],
                forma=estilo['forma'], margen=estilo['margen'],
            )
        else:
            contenido = render_qr_pdf(qr.url_data, **estilo)

        qr.descargado_veces += 1
        qr.save(update_fields=['descargado_veces'])

        return FileResponse(
            io.BytesIO(contenido),
            as_attachment=True,
            filename=f"{qr.titulo}.{formato}",
            content_type=FORMATO_CONTENT_TYPES[formato],
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
