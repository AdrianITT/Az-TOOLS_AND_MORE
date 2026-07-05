import re

from rest_framework import serializers

from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    AtributoPlantilla,
    AtributoPlantillaOpcion,
    Cliente,
    Cotizacion,
    CotizacionDetalle,
    CotizacionValor,
    Invitacion,
    Organization,
    Servicio,
    ServicioValor,
    Sucursal,
    User,
    validar_valor_atributo,
)


HEX_COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

COLOR_FIELDS = [
    'color_primario', 'color_fondo', 'color_superficie',
    'color_texto', 'color_menu_fondo', 'color_menu_texto',
]


def validate_color_fields(attrs):
    for field in COLOR_FIELDS:
        value = attrs.get(field)
        if value and not HEX_COLOR_RE.match(value):
            raise serializers.ValidationError({field: 'Debe ser un color hexadecimal válido, por ejemplo #3498db.'})
    return attrs


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'id', 'nombre', 'nombre_comercial', 'descripcion', 'ruc', 'giro',
            'razon_social', 'regimen_fiscal', 'uso_cfdi_default',
            'email', 'telefono', 'whatsapp', 'sitio_web',
            'direccion', 'calle', 'numero_exterior', 'colonia', 'ciudad',
            'estado', 'pais', 'codigo_postal',
            'facebook', 'instagram', 'twitter', 'linkedin',
            'plan', 'activo', 'fecha_registro', 'logo',
            'color_primario', 'color_fondo', 'color_superficie',
            'color_texto', 'color_menu_fondo', 'color_menu_texto',
        ]
        read_only_fields = ['id', 'fecha_registro']

    def validate(self, attrs):
        return validate_color_fields(attrs)


class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = [
            'id', 'organization', 'nombre', 'activo', 'email', 'telefono',
            'calle', 'numero_exterior', 'colonia', 'ciudad', 'estado', 'pais', 'codigo_postal',
            'color_primario', 'color_fondo', 'color_superficie',
            'color_texto', 'color_menu_fondo', 'color_menu_texto',
            'creado', 'actualizado',
        ]
        read_only_fields = ['id', 'organization', 'creado', 'actualizado']

    def validate(self, attrs):
        return validate_color_fields(attrs)


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


class AtributoPlantillaOpcionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AtributoPlantillaOpcion
        fields = ['id', 'valor', 'orden']
        read_only_fields = ['id']


class AtributoPlantillaSerializer(serializers.ModelSerializer):
    opciones = AtributoPlantillaOpcionSerializer(many=True, required=False)

    class Meta:
        model = AtributoPlantilla
        fields = [
            'id', 'organization', 'categoria', 'nombre', 'tipo',
            'obligatorio', 'orden', 'creado', 'opciones',
        ]
        read_only_fields = ['id', 'organization', 'creado']

    def create(self, validated_data):
        opciones_data = validated_data.pop('opciones', [])
        atributo = AtributoPlantilla.objects.create(**validated_data)
        for opcion_data in opciones_data:
            AtributoPlantillaOpcion.objects.create(atributo=atributo, **opcion_data)
        return atributo

    def update(self, instance, validated_data):
        opciones_data = validated_data.pop('opciones', None)
        instance = super().update(instance, validated_data)
        if opciones_data is not None:
            instance.opciones.all().delete()
            for opcion_data in opciones_data:
                AtributoPlantillaOpcion.objects.create(atributo=instance, **opcion_data)
        return instance


class ServicioValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioValor
        fields = ['id', 'atributo', 'valor']
        read_only_fields = ['id']

    def validate(self, attrs):
        try:
            attrs['valor'] = validar_valor_atributo(attrs['atributo'], attrs.get('valor', ''))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message)
        return attrs


class ServicioSerializer(serializers.ModelSerializer):
    valores = ServicioValorSerializer(many=True, required=False)

    class Meta:
        model = Servicio
        fields = [
            'id', 'organization', 'nombre', 'categoria', 'descripcion',
            'precio_base', 'activo', 'creado', 'creado_por', 'valores',
        ]
        read_only_fields = ['id', 'organization', 'creado', 'creado_por']

    def create(self, validated_data):
        valores_data = validated_data.pop('valores', [])
        servicio = Servicio.objects.create(**validated_data)
        for valor_data in valores_data:
            ServicioValor.objects.create(servicio=servicio, **valor_data)
        return servicio

    def update(self, instance, validated_data):
        valores_data = validated_data.pop('valores', None)
        instance = super().update(instance, validated_data)
        if valores_data is not None:
            instance.valores.all().delete()
            for valor_data in valores_data:
                ServicioValor.objects.create(servicio=instance, **valor_data)
        return instance


class CotizacionValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionValor
        fields = ['id', 'atributo', 'valor']
        read_only_fields = ['id']

    def validate(self, attrs):
        try:
            attrs['valor'] = validar_valor_atributo(attrs['atributo'], attrs.get('valor', ''))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message)
        return attrs


class CotizacionDetalleSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()
    valores = CotizacionValorSerializer(many=True, required=False)

    class Meta:
        model = CotizacionDetalle
        fields = [
            'id', 'cotizacion', 'servicio', 'cantidad',
            'precio_unitario', 'notas', 'creado', 'subtotal', 'valores',
        ]
        read_only_fields = ['id', 'creado']

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()

    def create(self, validated_data):
        valores_data = validated_data.pop('valores', [])
        detalle = CotizacionDetalle.objects.create(**validated_data)
        # save() ya prellenó desde ServicioValor; aplicar overrides explícitos del cliente
        for valor_data in valores_data:
            CotizacionValor.objects.update_or_create(
                detalle=detalle,
                atributo=valor_data['atributo'],
                defaults={'valor': valor_data['valor']},
            )
        return detalle


class CotizacionSerializer(serializers.ModelSerializer):
    items = CotizacionDetalleSerializer(many=True, read_only=True)
    iva_porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0)

    class Meta:
        model = Cotizacion
        fields = [
            'id', 'organization', 'cliente', 'usuario_creador', 'numero',
            'descripcion', 'estado', 'subtotal', 'iva_porcentaje', 'impuesto', 'total',
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
            'invitado_por', 'creado', 'expira', 'token',
        ]
        read_only_fields = [
            'id', 'organization', 'estado', 'invitado_por', 'creado', 'expira', 'token',
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


class RegistroOrganizacionSerializer(serializers.Serializer):
    """Crea una Organization nueva junto con su primer usuario (rol admin)."""

    nombre = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    ruc = serializers.CharField(required=False, allow_blank=True, default='')
    pais = serializers.CharField(required=False, allow_blank=True, default='Mexico')
    plan = serializers.ChoiceField(choices=Organization.PLAN_CHOICES, default='basico')
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_nombre(self, value):
        if Organization.objects.filter(nombre=value).exists():
            raise serializers.ValidationError('Ya existe una organización con ese nombre')
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ese nombre de usuario ya existe')
        return value

    def create(self, validated_data):
        from finanzas_app.models import CategoriaDeuda

        organization = Organization.objects.create(
            nombre=validated_data['nombre'],
            email=validated_data['email'],
            ruc=validated_data.get('ruc', ''),
            pais=validated_data.get('pais', 'Mexico'),
            plan=validated_data.get('plan', 'basico'),
        )
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            organization=organization,
            rol='admin',
            **User.permisos_por_defecto('admin'),
        )

        _CATEGORIAS_DEUDA_DEFAULT = [
            {'nombre': 'Tarjeta de crédito', 'icono': '💳', 'color': '#e74c3c', 'tipo_amortizacion': 'revolvente'},
            {'nombre': 'Línea de crédito',   'icono': '🏦', 'color': '#c0392b', 'tipo_amortizacion': 'revolvente'},
            {'nombre': 'Préstamo personal',  'icono': '🤝', 'color': '#e67e22', 'tipo_amortizacion': 'cuotas_fijas'},
            {'nombre': 'Préstamo hipotecario','icono': '🏠', 'color': '#d35400', 'tipo_amortizacion': 'cuotas_fijas'},
            {'nombre': 'Préstamo automotriz', 'icono': '🚗', 'color': '#f39c12', 'tipo_amortizacion': 'cuotas_fijas'},
            {'nombre': 'Préstamo de negocio', 'icono': '💼', 'color': '#8e44ad', 'tipo_amortizacion': 'cuotas_fijas'},
            {'nombre': 'Deuda con proveedores','icono': '📦', 'color': '#2980b9', 'tipo_amortizacion': 'cuenta_por_pagar'},
            {'nombre': 'Impuestos por pagar', 'icono': '🧾', 'color': '#16a085', 'tipo_amortizacion': 'cuenta_por_pagar'},
            {'nombre': 'Otro',               'icono': '📋', 'color': '#7f8c8d', 'tipo_amortizacion': 'cuotas_fijas'},
        ]
        CategoriaDeuda.objects.bulk_create([
            CategoriaDeuda(organization=organization, **cat)
            for cat in _CATEGORIAS_DEUDA_DEFAULT
        ])

        return user
