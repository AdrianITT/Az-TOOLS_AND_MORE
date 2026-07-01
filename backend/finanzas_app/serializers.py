from rest_framework import serializers
from decimal import Decimal
from .models import CategoriaIngreso, Ingreso, CategoriaGasto, Gasto


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
