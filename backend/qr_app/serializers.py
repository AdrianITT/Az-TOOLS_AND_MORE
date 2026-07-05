from rest_framework import serializers
from .models import CodigoQR

FORMA_CHOICES = [c[0] for c in CodigoQR.FORMA_CHOICES]
GRADIENTE_CHOICES = [c[0] for c in CodigoQR.GRADIENTE_CHOICES]
FORMATO_CHOICES = ['png', 'svg', 'pdf']


class CodigoQRSerializer(serializers.ModelSerializer):
    png_base64 = serializers.SerializerMethodField()
    cotizacion_numero = serializers.SerializerMethodField()

    class Meta:
        model = CodigoQR
        fields = [
            'id', 'titulo', 'url_data', 'color_fg', 'color_bg', 'forma', 'forma_ojos',
            'gradiente_tipo', 'color_gradiente', 'margen', 'logo',
            'cotizacion', 'cotizacion_numero', 'descargado_veces', 'creado', 'png_base64',
        ]
        read_only_fields = ['id', 'descargado_veces', 'creado', 'png_base64', 'cotizacion_numero']

    def get_png_base64(self, obj):
        import base64
        if obj.png_data:
            return base64.b64encode(obj.png_data).decode('utf-8')
        return None

    def get_cotizacion_numero(self, obj):
        return obj.cotizacion.numero if obj.cotizacion_id else None


class GenerarQRSerializer(serializers.Serializer):
    url_data = serializers.URLField()
    titulo = serializers.CharField(max_length=200, required=False)
    color_fg = serializers.CharField(max_length=7, default='#000000')
    color_bg = serializers.CharField(max_length=7, default='#FFFFFF')
    forma = serializers.ChoiceField(choices=FORMA_CHOICES, default='square')
    forma_ojos = serializers.ChoiceField(choices=FORMA_CHOICES, default='square')
    gradiente_tipo = serializers.ChoiceField(choices=GRADIENTE_CHOICES, default='none')
    color_gradiente = serializers.CharField(max_length=7, required=False, allow_blank=True, default='')
    margen = serializers.IntegerField(min_value=0, max_value=16, default=4)
    logo = serializers.ImageField(required=False, allow_null=True)
    formato = serializers.ChoiceField(choices=FORMATO_CHOICES, default='png')
    guardar = serializers.BooleanField(default=False)
    cotizacion = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs.get('gradiente_tipo') != 'none' and not attrs.get('color_gradiente'):
            raise serializers.ValidationError(
                {'color_gradiente': 'Requerido cuando se elige un tipo de degradado.'}
            )
        return attrs
