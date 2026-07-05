from rest_framework import serializers
from decimal import Decimal
from .models import CategoriaIngreso, Ingreso, CategoriaGasto, Gasto, CategoriaDeuda, Deuda, PagoDeuda


class CategoriaIngresoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaIngreso
        fields = ['id', 'nombre', 'color', 'icono', 'creado']
        read_only_fields = ['id', 'creado']


class IngresoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = Ingreso
        fields = ['id', 'categoria', 'categoria_nombre', 'monto', 'fecha', 'descripcion', 'creado_por', 'creado', 'actualizado']
        read_only_fields = ['id', 'creado_por', 'creado', 'actualizado']


class CategoriaGastoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaGasto
        fields = ['id', 'nombre', 'color', 'icono', 'creado']
        read_only_fields = ['id', 'creado']


class GastoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = Gasto
        fields = ['id', 'categoria', 'categoria_nombre', 'monto', 'fecha', 'descripcion', 'creado_por', 'creado', 'actualizado']
        read_only_fields = ['id', 'creado_por', 'creado', 'actualizado']


class DashboardResumenSerializer(serializers.Serializer):
    """Resumen de finanzas para dashboard"""
    mes = serializers.CharField()
    total_ingresos = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_gastos = serializers.DecimalField(max_digits=12, decimal_places=2)
    ganancia = serializers.DecimalField(max_digits=12, decimal_places=2)


class ResumenPorCategoriaSerializer(serializers.Serializer):
    """Resumen desglosado por categoría"""
    categoria = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2)


class MovimientoDetalleSerializer(serializers.Serializer):
    """Movimiento individual (ingreso o gasto) para el detalle de un mes"""
    tipo = serializers.ChoiceField(choices=['ingreso', 'gasto'])
    fecha = serializers.DateField()
    categoria = serializers.CharField()
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    descripcion = serializers.CharField(allow_blank=True, allow_null=True)


class GastoPorDiaSerializer(serializers.Serializer):
    """Total de gastos de un día puntual"""
    fecha = serializers.DateField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)


# ─── Deudas ───────────────────────────────────────────────────────────────────

class CategoriaDeudaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaDeuda
        fields = ['id', 'nombre', 'color', 'icono', 'tipo_amortizacion', 'creado']
        read_only_fields = ['id', 'creado']


class DeudaSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    categoria_color = serializers.CharField(source='categoria.color', read_only=True)
    categoria_tipo = serializers.CharField(source='categoria.tipo_amortizacion', read_only=True)

    class Meta:
        model = Deuda
        fields = [
            'id', 'categoria', 'categoria_nombre', 'categoria_color', 'categoria_tipo',
            'acreedor', 'monto_original', 'saldo_actual',
            'tasa_interes_anual', 'pago_periodico', 'dia_pago',
            'fecha_inicio', 'fecha_vencimiento', 'estado', 'notas',
            'creado_por', 'creado', 'actualizado',
        ]
        read_only_fields = ['id', 'creado_por', 'creado', 'actualizado']

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_vencimiento = attrs.get('fecha_vencimiento')
        if fecha_inicio and fecha_vencimiento and fecha_vencimiento <= fecha_inicio:
            raise serializers.ValidationError({'fecha_vencimiento': 'Debe ser posterior a la fecha de inicio.'})
        monto_original = attrs.get('monto_original')
        if monto_original is not None and monto_original <= 0:
            raise serializers.ValidationError({'monto_original': 'Debe ser mayor a cero.'})
        return attrs


class GastoBriefSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model = Gasto
        fields = ['id', 'monto', 'fecha', 'descripcion', 'categoria_nombre']


class PagoDeudaSerializer(serializers.ModelSerializer):
    gastos_cubiertos_ids = serializers.PrimaryKeyRelatedField(
        queryset=Gasto.objects.all(), many=True, write_only=True, required=False, source='gastos_cubiertos'
    )
    gastos_cubiertos = GastoBriefSerializer(many=True, read_only=True)

    class Meta:
        model = PagoDeuda
        fields = [
            'id', 'fecha', 'monto', 'saldo_resultante',
            'gastos_cubiertos', 'gastos_cubiertos_ids',
            'notas', 'creado_por', 'creado',
        ]
        read_only_fields = ['id', 'saldo_resultante', 'creado_por', 'creado']

    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError('El monto debe ser mayor a cero.')
        return value


class DeudaResumenSerializer(serializers.Serializer):
    total_deuda = serializers.DecimalField(max_digits=14, decimal_places=2)
    por_categoria = serializers.ListField()


class ProximoVencimientoSerializer(serializers.Serializer):
    deuda_id = serializers.IntegerField()
    acreedor = serializers.CharField()
    categoria = serializers.CharField()
    categoria_color = serializers.CharField()
    saldo_actual = serializers.DecimalField(max_digits=14, decimal_places=2)
    fecha_vencimiento = serializers.DateField(allow_null=True)
    dias_restantes = serializers.IntegerField(allow_null=True)
