import datetime
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
    comprobante = models.ImageField(upload_to='comprobantes/', null=True, blank=True)
    # Trazabilidad cotizador ↔ finanzas: el ingreso que registró una cotización aceptada
    cotizacion = models.ForeignKey(
        'cotizador_project.Cotizacion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ingresos',
    )
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
    comprobante = models.ImageField(upload_to='comprobantes/', null=True, blank=True)
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


# ─── Deudas ───────────────────────────────────────────────────────────────────

class CategoriaDeuda(models.Model):
    TIPO_AMORTIZACION_CHOICES = [
        ('revolvente', 'Revolvente'),
        ('cuotas_fijas', 'Cuotas fijas'),
        ('cuenta_por_pagar', 'Cuenta por pagar'),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='categorias_deuda'
    )
    nombre = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#e74c3c')
    icono = models.CharField(max_length=50, default='💳', blank=True)
    tipo_amortizacion = models.CharField(
        max_length=20, choices=TIPO_AMORTIZACION_CHOICES, default='cuotas_fijas'
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Categoria de Deuda'
        verbose_name_plural = 'Categorias de Deudas'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'nombre'], name='unique_categoria_deuda_por_org'),
        ]
        indexes = [models.Index(fields=['organization'], name='finanzas_ap_organiza_deuda_idx')]

    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"


class Deuda(models.Model):
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('pagada', 'Pagada'),
        ('vencida', 'Vencida'),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='deudas'
    )
    categoria = models.ForeignKey(
        CategoriaDeuda, on_delete=models.PROTECT, related_name='deudas'
    )
    acreedor = models.CharField(max_length=200)
    monto_original = models.DecimalField(max_digits=14, decimal_places=2)
    saldo_actual = models.DecimalField(max_digits=14, decimal_places=2)
    tasa_interes_anual = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    pago_periodico = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    dia_pago = models.PositiveSmallIntegerField(null=True, blank=True)
    fecha_inicio = models.DateField()
    fecha_vencimiento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    notas = models.TextField(blank=True, default='')
    comprobante = models.ImageField(upload_to='comprobantes/', null=True, blank=True)
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deudas_creadas'
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Deuda'
        verbose_name_plural = 'Deudas'
        indexes = [
            models.Index(fields=['organization', 'categoria'], name='finanzas_ap_deuda_org_cat_idx'),
            models.Index(fields=['organization', 'estado'], name='finanzas_ap_deuda_org_est_idx'),
        ]
        ordering = ['-creado']

    def __str__(self):
        return f"{self.acreedor} — ${self.saldo_actual} ({self.get_estado_display()})"


class PagoDeuda(models.Model):
    deuda = models.ForeignKey(Deuda, on_delete=models.CASCADE, related_name='pagos')
    fecha = models.DateField()
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    saldo_resultante = models.DecimalField(max_digits=14, decimal_places=2)
    gastos_cubiertos = models.ManyToManyField(Gasto, blank=True, related_name='pagos_deuda')
    notas = models.TextField(blank=True, default='')
    comprobante = models.ImageField(upload_to='comprobantes/', null=True, blank=True)
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pagos_deuda_creados'
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago de Deuda'
        verbose_name_plural = 'Pagos de Deuda'
        ordering = ['-fecha', '-creado']

    def __str__(self):
        return f"Pago ${self.monto} — {self.deuda.acreedor} ({self.fecha})"


class Recibo(models.Model):
    """Recibos de pagos/entregas — independiente de cotizaciones/finanzas"""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='recibos'
    )
    cliente_nombre = models.CharField(max_length=200, help_text='Nombre del cliente (libre)')
    cliente = models.ForeignKey(
        'cotizador_project.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recibos'
    )
    cantidad_personas = models.PositiveSmallIntegerField(default=1)
    descripcion = models.TextField(blank=True, default='')
    monto_total = models.DecimalField(max_digits=12, decimal_places=2)
    monto_pagado = models.DecimalField(max_digits=12, decimal_places=2)
    # Editable; por defecto la fecha en que se crea el recibo.
    fecha_creacion = models.DateField(default=datetime.date.today)
    # Fecha opcional que aplica a todos los servicios sin fecha propia.
    fecha_servicios = models.DateField(null=True, blank=True)
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recibos_creados'
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Recibo'
        verbose_name_plural = 'Recibos'
        indexes = [
            models.Index(fields=['organization', 'fecha_creacion'], name='recibo_org_fecha_idx'),
            models.Index(fields=['organization', 'cliente'], name='recibo_org_cliente_idx'),
        ]
        ordering = ['-fecha_creacion', '-creado']

    def __str__(self):
        cliente = self.cliente.nombre if self.cliente else self.cliente_nombre
        return f"Recibo {cliente} — ${self.monto_total} ({self.fecha_creacion})"

    @property
    def total_servicios(self):
        """Suma de los servicios registrados (con precio) del recibo."""
        return sum((i.subtotal for i in self.items.all() if i.subtotal is not None), Decimal('0.00'))


class ReciboItem(models.Model):
    """Servicio/producto incluido en un recibo. `atributos` es una copia (snapshot)
    de los valores del servicio al momento de agregarlo, para que el recibo no cambie
    si luego se edita el catálogo."""

    recibo = models.ForeignKey(Recibo, on_delete=models.CASCADE, related_name='items')
    servicio = models.ForeignKey(
        'cotizador_project.Servicio',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recibo_items'
    )
    nombre = models.CharField(max_length=200, help_text='Nombre del producto/servicio')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    # Null = sin precio registrado: no suma al total de servicios.
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fecha_servicio = models.DateField(null=True, blank=True)
    atributos = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = 'Item de Recibo'
        verbose_name_plural = 'Items de Recibo'
        ordering = ['id']

    def __str__(self):
        return f"{self.nombre} x{self.cantidad} (recibo {self.recibo_id})"

    @property
    def subtotal(self):
        if self.precio_unitario is None:
            return None
        return (self.cantidad * self.precio_unitario).quantize(Decimal('0.01'))
