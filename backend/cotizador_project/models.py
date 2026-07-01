import secrets
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import AbstractUser
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


class Servicio(models.Model):
    """Servicio base - padre para herencia"""

    TIPO_CHOICES = [
        ('pastel', 'Pastel'),
        ('tapiceria', 'Tapicería'),
        ('otro', 'Otro Servicio'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='servicios'
    )

    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
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
            models.Index(fields=['organization', 'tipo']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"


class PastelServicio(Servicio):
    """Pastel con atributos específicos"""

    color = models.CharField(max_length=100)
    tipo_pastel = models.CharField(max_length=100)  # Chocolate, vainilla, etc
    pisos = models.IntegerField()
    sabor = models.CharField(max_length=100)
    decoracion = models.TextField(blank=True)
    peso_aproximado = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True
    )

    class Meta:
        verbose_name = 'Pastel'
        verbose_name_plural = 'Pasteles'


class TapiceriaServicio(Servicio):
    """Tapicería con atributos específicos"""

    material = models.CharField(max_length=100)
    color = models.CharField(max_length=100)
    medidas = models.CharField(max_length=100)  # "100x150cm"
    tipo_mueble = models.CharField(max_length=100)  # Sofá, silla, etc
    estado_actual = models.CharField(max_length=100)
    requiere_instalacion = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Tapicería'
        verbose_name_plural = 'Tapicerías'


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


class ItemCotizacion(models.Model):
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
        super().save(*args, **kwargs)
        # Recalcular totales de la cotización
        self.cotizacion.calcular_totales()

    def delete(self, *args, **kwargs):
        cotizacion = self.cotizacion
        super().delete(*args, **kwargs)
        cotizacion.calcular_totales()


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
