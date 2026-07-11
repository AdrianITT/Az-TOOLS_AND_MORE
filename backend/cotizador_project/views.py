import html
import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.db.models import ProtectedError
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import OrganizationFilterMixin
from .models import (
    AtributoPlantilla,
    Cliente,
    Cotizacion,
    CotizacionDetalle,
    CotizacionValor,
    Invitacion,
    Servicio,
    Sucursal,
    User,
)
from .pdf import generar_pdf_cotizacion, enviar_pdf_por_email
from .permissions import (
    HasRolPermission,
    PuedeCrearCotizaciones,
    PuedeEliminarCotizaciones,
    PuedeGestionarUsuarios,
    PuedeVerReportes,
)
from .serializers import (
    AceptarInvitacionSerializer,
    AtributoPlantillaSerializer,
    ClienteSerializer,
    CotizacionDetalleSerializer,
    CotizacionSerializer,
    InvitacionSerializer,
    OrganizationSerializer,
    RegistroOrganizacionSerializer,
    ServicioSerializer,
    SucursalSerializer,
    UserSerializer,
)

logger = logging.getLogger('cotizador_project')


class ClienteViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Clientes de la organización actual."""

    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['tipo', 'activo']
    search_fields = ['nombre', 'email']
    ordering_fields = ['nombre', 'creado']
    ordering = ['-creado']

    def perform_create(self, serializer):
        if not self.request.user.organization.puede_crear_clientes():
            raise ValidationError('Has alcanzado el límite de clientes de tu plan')
        super().perform_create(serializer)


class SucursalViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Sucursales de la organización actual (dirección, contacto y tema propios)."""

    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated, PuedeGestionarUsuarios]
    filterset_fields = ['activo']
    search_fields = ['nombre']
    ordering = ['nombre']


class ServicioViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Servicios de la organización actual."""

    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['categoria', 'activo']
    search_fields = ['nombre']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )


class AtributoPlantillaViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Plantillas de atributos dinámicos por categoría, de la organización actual."""

    queryset = AtributoPlantilla.objects.all()
    serializer_class = AtributoPlantillaSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['categoria']
    search_fields = ['nombre', 'categoria']

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                'No se puede borrar este atributo porque ya está en uso en servicios o cotizaciones.'
            )


class CotizacionViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Cotizaciones de la organización actual."""

    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    permission_classes = [
        IsAuthenticated, HasRolPermission,
        PuedeCrearCotizaciones, PuedeEliminarCotizaciones,
    ]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar', 'partial_update': 'editar',
        'destroy': 'eliminar', 'cambiar_estado': 'editar', 'duplicar': 'crear',
    }
    filterset_fields = ['estado', 'cliente']
    search_fields = ['numero', 'cliente__nombre']
    ordering_fields = ['creado', 'total', 'estado']
    ordering = ['-creado']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            usuario_creador=self.request.user,
        )

    def perform_update(self, serializer):
        cotizacion = serializer.save()
        # Si cambió el % de IVA, recalcular impuesto/total con la nueva tasa.
        if 'iva_porcentaje' in serializer.validated_data:
            cotizacion.calcular_totales()

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de cotización"""
        cotizacion = self.get_object()
        nuevo_estado = request.data.get('estado')

        estados_validos = dict(Cotizacion.ESTADO_CHOICES)
        if nuevo_estado not in estados_validos:
            raise ValidationError({
                'estado': f'"{nuevo_estado}" no es un estado válido. Opciones: {", ".join(estados_validos)}.'
            })

        cotizacion.estado = nuevo_estado
        cotizacion.save()
        return Response(self.get_serializer(cotizacion).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Descargar cotización como PDF"""
        cotizacion = self.get_object()
        pdf_buffer = generar_pdf_cotizacion(cotizacion)
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f"{cotizacion.numero}.pdf",
            content_type='application/pdf'
        )

    @action(detail=True, methods=['post'])
    def compartir_email(self, request, pk=None):
        """Enviar cotización por email con PDF adjunto"""
        cotizacion = self.get_object()
        email_destino = request.data.get('email_destino', '').strip()

        if not email_destino:
            raise ValidationError({'email_destino': 'Email es requerido'})

        exito, mensaje = enviar_pdf_por_email(cotizacion, email_destino)

        if exito:
            return Response({'success': True, 'message': mensaje}, status=200)
        else:
            raise ValidationError({'error': mensaje})

    @action(detail=True, methods=['post'])
    def duplicar(self, request, pk=None):
        """Crea una copia en borrador de la cotización, con sus items y valores.

        La original nunca se modifica: solo se lee para construir la copia.
        """
        original = self.get_object()

        with transaction.atomic():
            copia = Cotizacion.objects.create(
                organization=original.organization,
                cliente=original.cliente,
                usuario_creador=request.user,
                descripcion=original.descripcion,
                estado='borrador',
                iva_porcentaje=original.iva_porcentaje,
                fecha_vencimiento=original.fecha_vencimiento,
            )

            for item in original.items.all():
                nuevo_item = CotizacionDetalle.objects.create(
                    cotizacion=copia,
                    servicio=item.servicio,
                    cantidad=item.cantidad,
                    precio_unitario=item.precio_unitario,
                    notas=item.notas,
                )
                # CotizacionDetalle.save() ya prellenó valores desde el catálogo
                # del servicio; sobreescribimos con los valores reales de la original.
                for valor in item.valores.all():
                    CotizacionValor.objects.update_or_create(
                        detalle=nuevo_item,
                        atributo=valor.atributo,
                        defaults={'valor': valor.valor},
                    )

        return Response(self.get_serializer(copia).data, status=201)


class CotizacionDetalleViewSet(viewsets.ModelViewSet):
    """Items de cotización."""

    queryset = CotizacionDetalle.objects.all()
    serializer_class = CotizacionDetalleSerializer
    permission_classes = [
        IsAuthenticated, PuedeCrearCotizaciones, PuedeEliminarCotizaciones,
    ]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return self.queryset.none()

        return self.queryset.filter(
            cotizacion__organization=self.request.user.organization
        )


class UserViewSet(
    OrganizationFilterMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Usuarios de la organización actual.
    El alta se hace vía invitación, no directamente aquí.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, PuedeGestionarUsuarios]
    filterset_fields = ['rol', 'activo']
    search_fields = ['username', 'email', 'first_name', 'last_name']


class InvitacionViewSet(
    OrganizationFilterMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Invitaciones para sumar usuarios a la organización actual."""

    queryset = Invitacion.objects.all()
    serializer_class = InvitacionSerializer
    permission_classes = [IsAuthenticated, PuedeGestionarUsuarios]
    filterset_fields = ['estado', 'rol']

    def perform_create(self, serializer):
        organization = self.request.user.organization

        if not organization.puede_crear_usuarios():
            raise ValidationError('Has alcanzado el límite de usuarios de tu plan')

        if Invitacion.objects.filter(
            organization=organization,
            email=serializer.validated_data['email'],
            estado='pendiente',
        ).exists():
            raise ValidationError('Ya existe una invitación pendiente para ese email')

        invitacion = serializer.save(
            organization=organization,
            invitado_por=self.request.user,
        )
        # La invitación ya quedó creada (el link es válido) aunque el envío de
        # correo falle (proveedor caído, dominio de prueba sin verificar,
        # etc.) — no tiene sentido tirar la petición completa por eso.
        try:
            self._enviar_email_invitacion(invitacion)
        except Exception:
            logger.exception('No se pudo enviar el email de invitación a %s', invitacion.email)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        invitacion = self.get_object()
        invitacion.estado = 'cancelada'
        invitacion.save()
        return Response(self.get_serializer(invitacion).data)

    def _enviar_email_invitacion(self, invitacion):
        link = f"{settings.FRONTEND_URL}/invitaciones/aceptar/{invitacion.token}"
        organizacion = html.escape(invitacion.organization.nombre)
        rol = html.escape(invitacion.get_rol_display())
        expira = invitacion.expira.strftime('%d/%m/%Y %H:%M')
        color = invitacion.organization.color_primario or '#3498db'
        subject = f"Invitación a unirte a {invitacion.organization.nombre} en AZ-Tools"

        text_body = (
            f"Has sido invitado a unirte a {invitacion.organization.nombre} como {invitacion.get_rol_display()}.\n\n"
            f"Crea tu cuenta con este link: {link}\n\n"
            f"Este link vence el {expira}."
        )

        html_body = f"""\
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2430;">
  <div style="padding: 32px 24px; text-align: center;">
    <h1 style="font-size: 18px; margin: 0 0 24px;">{organizacion}</h1>
    <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
      Has sido invitado a unirte como <strong>{rol}</strong>.
    </p>
    <a href="{link}"
       style="display: inline-block; background: {color}; color: #ffffff; text-decoration: none;
              padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
      Crear mi cuenta
    </a>
    <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0;">
      Este link vence el {expira}.
    </p>
  </div>
</div>
"""

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[invitacion.email],
        )
        email.attach_alternative(html_body, 'text/html')
        email.send()


class AceptarInvitacionView(APIView):
    """Endpoint público: crea la cuenta de usuario a partir de un token de invitación."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AceptarInvitacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'token': user.auth_token.key,
                'user': UserSerializer(user).data,
            },
            status=201,
        )


class OrganizacionActualView(APIView):
    """Datos (incluido el logo) de la organización del usuario autenticado."""

    permission_classes = [IsAuthenticated, PuedeGestionarUsuarios]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(
            OrganizationSerializer(request.user.organization, context={'request': request}).data
        )

    def patch(self, request):
        organization = request.user.organization
        data = request.data
        remove_logo = str(data.get('remove_logo', '')).lower() in ('1', 'true')
        serializer = OrganizationSerializer(
            organization, data=data, partial=True, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if remove_logo and organization.logo:
            organization.logo.delete(save=True)
        return Response(OrganizationSerializer(organization, context={'request': request}).data)


class MeView(APIView):
    """Perfil del usuario autenticado (organización y flags de permiso)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class RegistroOrganizacionView(APIView):
    """Endpoint público: crea una Organization nueva junto con su primer usuario admin."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroOrganizacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'token': user.auth_token.key,
                'user': UserSerializer(user).data,
            },
            status=201,
        )


class ReporteResumenView(APIView):
    """Resumen de cotizaciones y clientes de la organización actual."""

    permission_classes = [IsAuthenticated, PuedeVerReportes]

    def get(self, request):
        organization = request.user.organization
        cotizaciones = Cotizacion.objects.filter(organization=organization)

        por_estado = {}
        for estado, _label in Cotizacion.ESTADO_CHOICES:
            qs = cotizaciones.filter(estado=estado)
            por_estado[estado] = {
                'cantidad': qs.count(),
                'total': sum((c.total for c in qs), Decimal('0')),
            }

        return Response({
            'total_cotizaciones': cotizaciones.count(),
            'total_facturado': sum(
                (c.total for c in cotizaciones.filter(estado='aceptada')), Decimal('0')
            ),
            'clientes_activos': organization.clientes.filter(activo=True).count(),
            'por_estado': por_estado,
        })


# ─── Vista pública de cotización (QR / link compartido, sin autenticación) ────

class CotizacionPublicaView(APIView):
    """Datos de una cotización para la página pública /c/<token>.
    Expone solo lo relevante para el cliente final — nada interno."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        cotizacion = get_object_or_404(
            Cotizacion.objects.select_related('organization', 'cliente').prefetch_related('items__servicio'),
            token_publico=token,
        )
        org = cotizacion.organization
        logo_url = request.build_absolute_uri(org.logo.url) if org.logo else None

        return Response({
            'organizacion': {
                'nombre': org.nombre_comercial or org.nombre,
                'logo': logo_url,
                'color_primario': org.color_primario,
                'telefono': org.telefono,
                'whatsapp': org.whatsapp,
                'email': org.email,
            },
            'numero': cotizacion.numero,
            'estado': cotizacion.estado,
            'fecha': cotizacion.creado.date(),
            'fecha_vencimiento': cotizacion.fecha_vencimiento,
            'vencida': cotizacion.fecha_vencimiento < timezone.now().date(),
            'cliente': cotizacion.cliente.nombre,
            'items': [
                {
                    'servicio': item.servicio.nombre,
                    'cantidad': item.cantidad,
                    'precio_unitario': str(item.precio_unitario),
                    'subtotal': str(item.calcular_subtotal()),
                }
                for item in cotizacion.items.all()
            ],
            'subtotal': str(cotizacion.subtotal),
            'iva_porcentaje': str(cotizacion.iva_porcentaje),
            'impuesto': str(cotizacion.impuesto),
            'total': str(cotizacion.total),
        })


class CotizacionPublicaPdfView(APIView):
    """Descarga pública del PDF de la cotización, vía token."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        cotizacion = get_object_or_404(Cotizacion, token_publico=token)
        pdf_buffer = generar_pdf_cotizacion(cotizacion)
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f"{cotizacion.numero}.pdf",
            content_type='application/pdf',
        )
