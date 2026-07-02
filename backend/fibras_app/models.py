from django.db import models
from cotizador_project.models import Organization, User


class Fibra(models.Model):
    """Catálogo de FIBRAs mexicanas (dato de mercado público, sin organization)."""

    ticker = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)
    sector = models.CharField(max_length=100, blank=True)
    activo = models.BooleanField(default=True)
    moneda = models.CharField(max_length=3, default='MXN')
    ultima_actualizacion = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'FIBRA'
        verbose_name_plural = 'FIBRAs'
        ordering = ['ticker']

    def __str__(self):
        return f"{self.ticker} - {self.nombre}"


class PrecioHistorico(models.Model):
    """Precio de cierre histórico de una FIBRA (dato de mercado público)."""

    fibra = models.ForeignKey(Fibra, on_delete=models.CASCADE, related_name='precios')
    fecha = models.DateField()
    precio_cierre = models.DecimalField(max_digits=12, decimal_places=4)
    precio_apertura = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    precio_max = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    precio_min = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    volumen = models.BigIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = 'Precio Histórico'
        verbose_name_plural = 'Precios Históricos'
        constraints = [
            models.UniqueConstraint(fields=['fibra', 'fecha'], name='unique_precio_por_fibra_fecha'),
        ]
        indexes = [
            models.Index(fields=['fibra', 'fecha']),
        ]
        ordering = ['fecha']

    def __str__(self):
        return f"{self.fibra.ticker} @ {self.fecha}: {self.precio_cierre}"


class DividendoHistorico(models.Model):
    """Dividendo pagado por certificado en una fecha dada (dato de mercado público)."""

    fibra = models.ForeignKey(Fibra, on_delete=models.CASCADE, related_name='dividendos')
    fecha_pago = models.DateField()
    monto_por_certificado = models.DecimalField(max_digits=12, decimal_places=6)

    class Meta:
        verbose_name = 'Dividendo Histórico'
        verbose_name_plural = 'Dividendos Históricos'
        constraints = [
            models.UniqueConstraint(fields=['fibra', 'fecha_pago'], name='unique_dividendo_por_fibra_fecha'),
        ]
        indexes = [
            models.Index(fields=['fibra', 'fecha_pago']),
        ]
        ordering = ['fecha_pago']

    def __str__(self):
        return f"{self.fibra.ticker} @ {self.fecha_pago}: {self.monto_por_certificado}"


class SimulacionInversion(models.Model):
    """Historial de simulaciones de inversión guardadas por una organización."""

    TIPO_CHOICES = [
        ('simple', 'Simple'),
        ('comparacion', 'Comparación'),
        ('dca', 'Aportaciones periódicas'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='simulaciones_inversion'
    )
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='simulaciones_creadas'
    )
    nombre = models.CharField(max_length=150, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    parametros = models.JSONField()
    resultado = models.JSONField()
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Simulación de Inversión'
        verbose_name_plural = 'Simulaciones de Inversión'
        indexes = [
            models.Index(fields=['organization', '-creado']),
        ]
        ordering = ['-creado']

    def __str__(self):
        return f"{self.nombre or self.tipo} ({self.organization.nombre})"
