from rest_framework import serializers

from .models import (
    Cliente,
    Cotizacion,
    Invitacion,
    ItemCotizacion,
    Organization,
    PastelServicio,
    Servicio,
    TapiceriaServicio,
    User,
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'id', 'nombre', 'ruc', 'email', 'telefono', 'sitio_web',
            'direccion', 'ciudad', 'pais', 'plan', 'activo',
            'fecha_registro', 'logo', 'color_primario',
        ]
        read_only_fields = ['id', 'fecha_registro']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'organization', 'rol', 'activo', 'puede_crear_cotizaciones',
            'puede_eliminar_cotizaciones', 'puede_ver_reportes',
            'puede_gestionar_usuarios',
        ]
        read_only_fields = ['id', 'organization']


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            'id', 'organization', 'nombre', 'tipo', 'nombre_personal',
            'cedula', 'nombre_empresa', 'ruc', 'email', 'telefono',
            'direccion', 'creado', 'actualizado', 'activo',
        ]
        read_only_fields = ['id', 'organization', 'creado', 'actualizado']


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = [
            'id', 'organization', 'nombre', 'tipo', 'descripcion',
            'precio_base', 'activo', 'creado', 'creado_por',
        ]
        read_only_fields = ['id', 'organization', 'creado', 'creado_por']


class PastelServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PastelServicio
        fields = [
            'id', 'organization', 'nombre', 'tipo', 'descripcion',
            'precio_base', 'activo', 'creado', 'creado_por',
            'color', 'tipo_pastel', 'pisos', 'sabor', 'decoracion',
            'peso_aproximado',
        ]
        read_only_fields = ['id', 'organization', 'creado', 'creado_por']


class TapiceriaServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TapiceriaServicio
        fields = [
            'id', 'organization', 'nombre', 'tipo', 'descripcion',
            'precio_base', 'activo', 'creado', 'creado_por',
            'material', 'color', 'medidas', 'tipo_mueble',
            'estado_actual', 'requiere_instalacion',
        ]
        read_only_fields = ['id', 'organization', 'creado', 'creado_por']


class ItemCotizacionSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemCotizacion
        fields = [
            'id', 'cotizacion', 'servicio', 'cantidad',
            'precio_unitario', 'notas', 'creado', 'subtotal',
        ]
        read_only_fields = ['id', 'creado']

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()


class CotizacionSerializer(serializers.ModelSerializer):
    items = ItemCotizacionSerializer(many=True, read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            'id', 'organization', 'cliente', 'usuario_creador', 'numero',
            'descripcion', 'estado', 'subtotal', 'impuesto', 'total',
            'fecha_vencimiento', 'creado', 'actualizado', 'items',
        ]
        read_only_fields = [
            'id', 'organization', 'usuario_creador', 'numero',
            'subtotal', 'impuesto', 'total', 'creado', 'actualizado',
        ]


class InvitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitacion
        fields = [
            'id', 'organization', 'email', 'rol', 'estado',
            'invitado_por', 'creado', 'expira',
        ]
        read_only_fields = [
            'id', 'organization', 'estado', 'invitado_por', 'creado', 'expira',
        ]


class AceptarInvitacionSerializer(serializers.Serializer):
    """Crea la cuenta de usuario a partir de una invitación vigente."""

    token = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_token(self, value):
        try:
            invitacion = Invitacion.objects.get(token=value)
        except Invitacion.DoesNotExist:
            raise serializers.ValidationError('Invitación no válida')

        if not invitacion.esta_vigente():
            raise serializers.ValidationError('Esta invitación ya no está vigente')

        self._invitacion = invitacion
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ese nombre de usuario ya existe')
        return value

    def validate(self, attrs):
        if not self._invitacion.organization.puede_crear_usuarios():
            raise serializers.ValidationError(
                'La organización alcanzó el límite de usuarios de su plan'
            )
        return attrs

    def create(self, validated_data):
        invitacion = self._invitacion
        user = User.objects.create_user(
            username=validated_data['username'],
            email=invitacion.email,
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            organization=invitacion.organization,
            rol=invitacion.rol,
            **User.permisos_por_defecto(invitacion.rol),
        )
        invitacion.estado = 'aceptada'
        invitacion.save()
        return user
