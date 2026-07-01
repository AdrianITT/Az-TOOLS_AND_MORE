from django.contrib import admin
from .models import CodigoQR


@admin.register(CodigoQR)
class CodigoQRAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'organization', 'creado_por', 'descargado_veces', 'creado']
    list_filter = ['organization', 'creado', 'forma']
    search_fields = ['titulo', 'url_data']
    readonly_fields = ['descargado_veces', 'creado', 'actualizado']
