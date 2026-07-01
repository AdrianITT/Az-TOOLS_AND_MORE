from rest_framework import serializers
from .models import CodigoQR


class CodigoQRSerializer(serializers.ModelSerializer):
    png_base64 = serializers.SerializerMethodField()

    class Meta:
        model = CodigoQR
        fields = ['id', 'titulo', 'url_data', 'color_fg', 'color_bg', 'forma', 'descargado_veces', 'creado', 'png_base64']
        read_only_fields = ['id', 'descargado_veces', 'creado', 'png_base64']

    def get_png_base64(self, obj):
        import base64
        if obj.png_data:
            return base64.b64encode(obj.png_data).decode('utf-8')
        return None


class GenerarQRSerializer(serializers.Serializer):
    url_data = serializers.URLField()
    titulo = serializers.CharField(max_length=200, required=False)
    color_fg = serializers.CharField(max_length=7, default='#000000')
    color_bg = serializers.CharField(max_length=7, default='#FFFFFF')
    forma = serializers.ChoiceField(choices=['square', 'rounded'], default='square')
    guardar = serializers.BooleanField(default=False)
