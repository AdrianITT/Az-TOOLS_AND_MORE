from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import OrganizationFilterMixin
from .models import Cliente, Cotizacion, Invitacion, ItemCotizacion, Servicio, User
from .permissions import (
    HasRolPermission,
    PuedeCrearCotizaciones,
    PuedeEliminarCotizaciones,
    PuedeGestionarUsuarios,
    PuedeVerReportes,
)
from .serializers import (
    AceptarInvitacionSerializer,
    ClienteSerializer,
    CotizacionSerializer,
    InvitacionSerializer,
    ItemCotizacionSerializer,
    ServicioSerializer,
    UserSerializer,
)


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


class ServicioViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Servicios de la organización actual."""

    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['tipo', 'activo']
    search_fields = ['nombre']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
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
        'destroy': 'eliminar', 'cambiar_estado': 'editar',
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

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de cotización"""
        cotizacion = self.get_object()
        nuevo_estado = request.data.get('estado')

        cotizacion.estado = nuevo_estado
        cotizacion.save()
        return Response(self.get_serializer(cotizacion).data)


class ItemCotizacionViewSet(viewsets.ModelViewSet):
    """Items de cotización."""

    queryset = ItemCotizacion.objects.all()
    serializer_class = ItemCotizacionSerializer
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
        self._enviar_email_invitacion(invitacion)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        invitacion = self.get_object()
        invitacion.estado = 'cancelada'
        invitacion.save()
        return Response(self.get_serializer(invitacion).data)

    def _enviar_email_invitacion(self, invitacion):
        link = f"{settings.FRONTEND_URL}/invitaciones/aceptar/{invitacion.token}"
        send_mail(
            subject=f"Invitación a unirte a {invitacion.organization.nombre} en AZ-Tools",
            message=(
                f"Has sido invitado como {invitacion.get_rol_display()}.\n"
                f"Crea tu cuenta con este link: {link}\n"
                f"Vigente hasta el {invitacion.expira:%Y-%m-%d %H:%M}."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitacion.email],
        )


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
