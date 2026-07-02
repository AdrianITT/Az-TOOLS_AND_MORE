from django.contrib import admin
from .models import Fibra, PrecioHistorico, DividendoHistorico, SimulacionInversion


@admin.register(Fibra)
class FibraAdmin(admin.ModelAdmin):
    list_display = ['ticker', 'nombre', 'sector', 'activo', 'ultima_actualizacion']
    list_filter = ['activo', 'sector']
    search_fields = ['ticker', 'nombre']
    readonly_fields = ['creado']


@admin.register(PrecioHistorico)
class PrecioHistoricoAdmin(admin.ModelAdmin):
    list_display = ['fibra', 'fecha', 'precio_cierre', 'volumen']
    list_filter = ['fibra']
    search_fields = ['fibra__ticker']
    date_hierarchy = 'fecha'


@admin.register(DividendoHistorico)
class DividendoHistoricoAdmin(admin.ModelAdmin):
    list_display = ['fibra', 'fecha_pago', 'monto_por_certificado']
    list_filter = ['fibra']
    search_fields = ['fibra__ticker']
    date_hierarchy = 'fecha_pago'


@admin.register(SimulacionInversion)
class SimulacionInversionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'organization', 'creado_por', 'creado']
    list_filter = ['organization', 'tipo', 'creado']
    search_fields = ['nombre', 'organization__nombre']
    readonly_fields = ['creado']
