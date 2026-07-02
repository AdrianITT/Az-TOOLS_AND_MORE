from rest_framework import serializers
from .models import Fibra, PrecioHistorico, DividendoHistorico, SimulacionInversion


class FibraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fibra
        fields = ['id', 'ticker', 'nombre', 'sector', 'activo', 'moneda', 'ultima_actualizacion']
        read_only_fields = fields


class PrecioHistoricoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrecioHistorico
        fields = ['fecha', 'precio_cierre', 'precio_apertura', 'precio_max', 'precio_min', 'volumen']


class DividendoHistoricoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DividendoHistorico
        fields = ['fecha_pago', 'monto_por_certificado']


class SimularSerializer(serializers.Serializer):
    """Valida el request de POST /api/fibras/simular/."""

    tickers = serializers.ListField(child=serializers.CharField(), min_length=1, max_length=6)
    monto_inicial = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    fecha_inicio = serializers.DateField()
    fecha_fin = serializers.DateField()
    reinvertir_dividendos = serializers.BooleanField(default=False)
    aportacion_periodica = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, required=False, allow_null=True)
    frecuencia_aportacion = serializers.ChoiceField(choices=['mensual', 'anual'], required=False, allow_null=True)

    def validate(self, data):
        if data['fecha_inicio'] >= data['fecha_fin']:
            raise serializers.ValidationError('fecha_inicio debe ser anterior a fecha_fin.')
        if data.get('aportacion_periodica') and not data.get('frecuencia_aportacion'):
            raise serializers.ValidationError('frecuencia_aportacion es requerida cuando se especifica aportacion_periodica.')
        return data


class SimulacionInversionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulacionInversion
        fields = ['id', 'nombre', 'tipo', 'parametros', 'resultado', 'creado_por', 'creado']
        read_only_fields = ['id', 'creado_por', 'creado']
