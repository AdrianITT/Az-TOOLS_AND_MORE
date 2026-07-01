from decimal import Decimal
from django.db import models
from django.utils import timezone
from cotizador_project.models import Organization, User


class CategoriaIngreso(models.Model):
    """Categoría de ingresos (venta, servicios, etc.)"""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='categorias_ingreso'
    )
    nombre = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#3498db')
    icono = models.CharField(max_length=50, default='💰', blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Categoría de Ingreso'
        verbose_name_plural = 'Categorías de Ingresos'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'nombre'], name='unique_categoria_ingreso_por_org'),
        ]
        indexes = [
            models.Index(fields=['organization']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"


class Ingreso(models.Model):
    """Registro de ingreso/ingresos"""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='ingresos'
    )
    categoria = models.ForeignKey(
        CategoriaIngreso,
        on_delete=models.PROTECT,
        related_name='ingresos'
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateField()
    descripcion = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ingresos_creados'
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Ingreso'
        verbose_name_plural = 'Ingresos'
        indexes = [
            models.Index(fields=['organization', 'fecha']),
            models.Index(fields=['organization', 'categoria']),
        ]
        ordering = ['-fecha', '-creado']

    def __str__(self):
        return f"${self.monto} - {self.categoria.nombre} ({self.fecha})"


class CategoriaGasto(models.Model):
    """Categoría de gastos (operativo, marketing, etc.)"""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='categorias_gasto'
    )
    nombre = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#e74c3c')
    icono = models.CharField(max_length=50, default='💸', blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Categoría de Gasto'
        verbose_name_plural = 'Categorías de Gastos'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'nombre'], name='unique_categoria_gasto_por_org'),
        ]
        indexes = [
            models.Index(fields=['organization']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"


class Gasto(models.Model):
    """Registro de gasto/egreso"""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='gastos'
    )
    categoria = models.ForeignKey(
        CategoriaGasto,
        on_delete=models.PROTECT,
        related_name='gastos'
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateField()
    descripcion = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gastos_creados'
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Gasto'
        verbose_name_plural = 'Gastos'
        indexes = [
            models.Index(fields=['organization', 'fecha']),
            models.Index(fields=['organization', 'categoria']),
        ]
        ordering = ['-fecha', '-creado']

    def __str__(self):
        return f"${self.monto} - {self.categoria.nombre} ({self.fecha})"
