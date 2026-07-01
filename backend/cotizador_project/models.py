import secrets
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Organization(models.Model):
    """
    Representa una empresa/organización que usa el cotizador.
    Cada organización tiene sus propios clientes, servicios, cotizaciones.
    """

    PLAN_CHOICES = [
        ('basico', 'Plan Básico'),
        ('profesional', 'Plan Profesional'),
        ('empresa', 'Plan Empresa'),
    ]

    PLAN_LIMITES_USUARIOS = {
        'basico': 3,
        'profesional': 10,
        'empresa': 999,
    }

    PLAN_LIMITES_CLIENTES = {
        'basico': 50,
        'profesional': 500,
        'empresa': 999999,
    }

    nombre = models.CharField(max_length=200, unique=True)
    ruc = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True, null=True)
    sitio_web = models.URLField(blank=True, null=True)

    # Datos legales
    direccion = models.TextField(blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    pais = models.CharField(max_length=100, default='Mexico')

    # Suscripción
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='basico')
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    # Logo/branding
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    color_primario = models.CharField(max_length=7, default='#3498db')

    class Meta:
        verbose_name = 'Organización'
        verbose_name_plural = 'Organizaciones'
        ordering = ['-fecha_registro']

    def __str__(self):
        return self.nombre

    def puede_crear_usuarios(self):
        """Determina límites según plan"""
        limite = self.PLAN_LIMITES_USUARIOS[self.plan]
        return self.users.filter(activo=True).count() < limite

    def puede_crear_clientes(self):
        """Determina límites de clientes según plan"""
        limite = self.PLAN_LIMITES_CLIENTES[self.plan]
        return self.clientes.filter(activo=True).count() < limite


class User(AbstractUser):
    """
    Usuario personalizado vinculado a una Organización.
    """

    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('vendedor', 'Vendedor'),
        ('gerente', 'Gerente'),
        ('contador', 'Contador'),
        ('visualizador', 'Solo visualización'),
    ]

    PERMISOS_POR_ROL = {
        'admin': ['crear', 'editar', 'eliminar', 'reportes', 'usuarios'],
        'gerente': ['crear', 'editar', 'reportes'],
        'vendedor': ['crear', 'editar'],
        'contador': ['reportes'],
        'visualizador': ['leer'],
    }

    # Valores por defecto de los flags de permisos según el rol, usados al
    # crear un usuario (alta directa o aceptación de invitación).
    FLAGS_POR_DEFECTO_POR_ROL = {
        'admin': dict(
            puede_crear_cotizaciones=True,
            puede_eliminar_cotizaciones=True,
            puede_ver_reportes=True,
            puede_gestionar_usuarios=True,
        ),
        'gerente': dict(
            puede_crear_cotizaciones=True,
            puede_eliminar_cotizaciones=False,
            puede_ver_reportes=True,
            puede_gestionar_usuarios=False,
        ),
        'vendedor': dict(
            puede_crear_cotizaciones=True,
            puede_eliminar_cotizaciones=False,
            puede_ver_reportes=False,
            puede_gestionar_usuarios=False,
        ),
        'contador': dict(
            puede_crear_cotizaciones=False,
            puede_eliminar_cotizaciones=False,
            puede_ver_reportes=True,
            puede_gestionar_usuarios=False,
        ),
        'visualizador': dict(
            puede_crear_cotizaciones=False,
            puede_eliminar_cotizaciones=False,
            puede_ver_reportes=False,
            puede_gestionar_usuarios=False,
        ),
    }

    # Nulo solo para superusuarios de plataforma (staff de Django admin sin
    # pertenecer a ninguna organización). Todo usuario "de negocio" siempre
    # tiene organization asignada (por alta directa o invitación).
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
    )
    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='vendedor')
    activo = models.BooleanField(default=True)

    # Permisos específicos
    puede_crear_cotizaciones = models.BooleanField(default=True)
    puede_eliminar_cotizaciones = models.BooleanField(default=False)
    puede_ver_reportes = models.BooleanField(default=False)
    puede_gestionar_usuarios = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        nombre = self.get_full_name() or self.username
        if self.organization_id:
            return f"{nombre} ({self.organization.nombre})"
        return nombre

    def tiene_permiso(self, permiso):
        """Helper para verificar permisos"""
        return permiso in self.PERMISOS_POR_ROL.get(self.rol, [])

    @classmethod
    def permisos_por_defecto(cls, rol):
        """Flags de permisos iniciales para un rol dado"""
        return dict(cls.FLAGS_POR_DEFECTO_POR_ROL.get(rol, {}))


class Cliente(models.Model):
    """Cliente de una organización específica"""

    TIPO_CLIENTE = [
        ('persona', 'Persona Natural'),
        ('empresa', 'Empresa'),
        ('ambos', 'Persona y Empresa'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='clientes'
    )

    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CLIENTE, default='persona')

    # Datos personales
    nombre_personal = models.CharField(max_length=200, blank=True, null=True)
    cedula = models.CharField(max_length=20, blank=True, null=True)

    # Datos empresa
    nombre_empresa = models.CharField(max_length=200, blank=True, null=True)
    ruc = models.CharField(max_length=20, blank=True, null=True)

    # Contacto
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)

    # Admin
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'email'], name='unique_cliente_email_por_org'),
        ]
        indexes = [
            models.Index(fields=['organization', 'nombre']),
            models.Index(fields=['organization', 'email']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"


class TipoAtributo(models.TextChoices):
    TEXTO = 'text', 'Texto'
    NUMERO = 'number', 'Número'
    DECIMAL = 'decimal', 'Decimal'
    BOOLEAN = 'boolean', 'Booleano'
    COLOR = 'color', 'Color'
    LISTA = 'select', 'Lista'


def validar_valor_atributo(atributo, valor):
    """Valida y normaliza `valor` según el tipo/opciones/obligatoriedad de `atributo`."""
    if valor in (None, ''):
        if atributo.obligatorio:
            raise ValidationError(f"El atributo '{atributo.nombre}' es obligatorio")
        return valor

    if atributo.tipo == TipoAtributo.NUMERO:
        try:
            int(valor)
        except (TypeError, ValueError):
            raise ValidationError(f"'{atributo.nombre}' debe ser un número entero")
    elif atributo.tipo == TipoAtributo.DECIMAL:
        try:
            Decimal(valor)
        except Exception:
            raise ValidationError(f"'{atributo.nombre}' debe ser un número decimal")
    elif atributo.tipo == TipoAtributo.BOOLEAN:
        if str(valor).lower() not in ('true', 'false', '1', '0'):
            raise ValidationError(f"'{atributo.nombre}' debe ser verdadero/falso")
    elif atributo.tipo == TipoAtributo.LISTA:
        opciones = set(atributo.opciones.values_list('valor', flat=True))
        if valor not in opciones:
            raise ValidationError(f"'{valor}' no es una opción válida para '{atributo.nombre}'")

    return valor


class AtributoPlantilla(models.Model):
    """Definición reutilizable de un atributo custom para una categoría de servicio de una organización."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='plantillas_atributo'
    )
    categoria = models.CharField(max_length=50)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TipoAtributo.choices)
    obligatorio = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Plantilla de Atributo'
        verbose_name_plural = 'Plantillas de Atributo'
        ordering = ['orden', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'categoria', 'nombre'],
                name='unique_plantilla_attr_por_categoria',
            ),
        ]
        indexes = [
            models.Index(fields=['organization', 'categoria']),
        ]

    def __str__(self):
        return f"{self.categoria}.{self.nombre} ({self.organization.nombre})"


class AtributoPlantillaOpcion(models.Model):
    """Opción válida para un AtributoPlantilla de tipo lista (select)."""

    atributo = models.ForeignKey(
        AtributoPlantilla,
        on_delete=models.CASCADE,
        related_name='opciones'
    )
    valor = models.CharField(max_length=100)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Opción de Atributo'
        verbose_name_plural = 'Opciones de Atributo'
        ordering = ['orden', 'id']
        constraints = [
            models.UniqueConstraint(fields=['atributo', 'valor'], name='unique_opcion_por_atributo'),
        ]

    def __str__(self):
        return f"{self.valor} ({self.atributo})"


class Servicio(models.Model):
    """Servicio/producto de catálogo. Sus atributos custom son dinámicos vía AtributoPlantilla."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='servicios'
    )

    nombre = models.CharField(max_length=200)
    categoria = models.CharField(max_length=50, blank=True)
    descripcion = models.TextField(blank=True, null=True)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)

    # Control
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'nombre'], name='unique_servicio_nombre_por_org'),
        ]
        indexes = [
            models.Index(fields=['organization', 'categoria']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"


class ServicioValor(models.Model):
    """Valor por defecto de catálogo para un atributo dinámico de un Servicio."""

    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='valores')
    atributo = models.ForeignKey(AtributoPlantilla, on_delete=models.PROTECT)
    valor = models.TextField()

    class Meta:
        verbose_name = 'Valor de Servicio'
        verbose_name_plural = 'Valores de Servicio'
        constraints = [
            models.UniqueConstraint(fields=['servicio', 'atributo'], name='unique_valor_por_servicio_atributo'),
        ]

    def clean(self):
        if self.atributo.categoria != self.servicio.categoria:
            raise ValidationError('El atributo no pertenece a la categoría del servicio')
        self.valor = validar_valor_atributo(self.atributo, self.valor)

    def __str__(self):
        return f"{self.servicio}.{self.atributo.nombre} = {self.valor}"


class Cotizacion(models.Model):
    """Cotización de una organización"""

    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('enviada', 'Enviada'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
        ('expirada', 'Expirada'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='cotizaciones'
    )

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='cotizaciones'
    )
    usuario_creador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cotizaciones_creadas'
    )

    numero = models.CharField(max_length=50)  # NO unique a nivel global, solo por org
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')

    # Montos
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Fechas
    fecha_vencimiento = models.DateField()
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cotización'
        verbose_name_plural = 'Cotizaciones'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'numero'], name='unique_cotizacion_numero_por_org'),
        ]
        indexes = [
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['organization', 'cliente']),
            models.Index(fields=['organization', '-creado']),
        ]

    def calcular_totales(self):
        """Recalcula montos según items"""
        items = self.items.all()
        self.subtotal = sum((item.calcular_subtotal() for item in items), Decimal('0'))
        self.impuesto = self.subtotal * Decimal('0.16')
        self.total = self.subtotal + self.impuesto
        self.save()

    def save(self, *args, **kwargs):
        # Generar número único por organización
        if not self.numero:
            fecha = timezone.now().strftime("%Y%m%d")
            ultimo = Cotizacion.objects.filter(
                organization=self.organization,
                numero__startswith=f"COT-{fecha}"
            ).order_by('numero').last()

            secuencia = 1
            if ultimo:
                secuencia = int(ultimo.numero.split('-')[-1]) + 1

            self.numero = f"COT-{fecha}-{secuencia:04d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero} ({self.organization.nombre})"


class CotizacionDetalle(models.Model):
    """Item de una cotización"""

    cotizacion = models.ForeignKey(
        Cotizacion,
        on_delete=models.CASCADE,
        related_name='items'
    )
    servicio = models.ForeignKey(
        Servicio,
        on_delete=models.PROTECT
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    notas = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Item de Cotización'
        verbose_name_plural = 'Items de Cotización'
        ordering = ['id']

    def calcular_subtotal(self):
        return self.cantidad * self.precio_unitario

    def __str__(self):
        return f"{self.servicio.nombre} x {self.cantidad}"

    def save(self, *args, **kwargs):
        es_nuevo = self._state.adding
        super().save(*args, **kwargs)
        if es_nuevo:
            # Prellenar valores desde el catálogo (ServicioValor) del servicio
            valores_existentes = set(self.valores.values_list('atributo_id', flat=True))
            nuevos = [
                CotizacionValor(detalle=self, atributo_id=sv.atributo_id, valor=sv.valor)
                for sv in self.servicio.valores.all()
                if sv.atributo_id not in valores_existentes
            ]
            if nuevos:
                CotizacionValor.objects.bulk_create(nuevos)
        # Recalcular totales de la cotización
        self.cotizacion.calcular_totales()

    def delete(self, *args, **kwargs):
        cotizacion = self.cotizacion
        super().delete(*args, **kwargs)
        cotizacion.calcular_totales()


class CotizacionValor(models.Model):
    """Valor de un atributo dinámico específico para un item de cotización.

    Se prellena desde ServicioValor al crear el CotizacionDetalle, pero puede
    sobreescribirse por cotización (ej. el cliente pide un sabor distinto).
    """

    detalle = models.ForeignKey(CotizacionDetalle, on_delete=models.CASCADE, related_name='valores')
    atributo = models.ForeignKey(AtributoPlantilla, on_delete=models.PROTECT)
    valor = models.TextField()

    class Meta:
        verbose_name = 'Valor de Cotización'
        verbose_name_plural = 'Valores de Cotización'
        constraints = [
            models.UniqueConstraint(fields=['detalle', 'atributo'], name='unique_valor_por_detalle_atributo'),
        ]

    def clean(self):
        if self.atributo.categoria != self.detalle.servicio.categoria:
            raise ValidationError('El atributo no pertenece a la categoría del servicio')
        self.valor = validar_valor_atributo(self.atributo, self.valor)

    def __str__(self):
        return f"{self.detalle}.{self.atributo.nombre} = {self.valor}"


class Invitacion(models.Model):
    """Invitación para que una persona se una como usuario de una organización"""

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aceptada', 'Aceptada'),
        ('cancelada', 'Cancelada'),
    ]

    DIAS_VIGENCIA = 7

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitaciones'
    )
    email = models.EmailField()
    rol = models.CharField(max_length=20, choices=User.ROLE_CHOICES, default='vendedor')
    token = models.CharField(max_length=64, unique=True, editable=False)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    invitado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invitaciones_enviadas'
    )
    creado = models.DateTimeField(auto_now_add=True)
    expira = models.DateTimeField()

    class Meta:
        verbose_name = 'Invitación'
        verbose_name_plural = 'Invitaciones'
        ordering = ['-creado']

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expira:
            self.expira = timezone.now() + timedelta(days=self.DIAS_VIGENCIA)
        super().save(*args, **kwargs)

    def esta_vigente(self):
        return self.estado == 'pendiente' and self.expira > timezone.now()

    def __str__(self):
        return f"Invitación a {self.email} ({self.organization.nombre})"
