from django.contrib import admin
from .models import CategoriaIngreso, Ingreso, CategoriaGasto, Gasto


@admin.register(CategoriaIngreso)
class CategoriaIngresoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'organization', 'icono', 'creado']
    list_filter = ['organization', 'creado']
    search_fields = ['nombre', 'organization__nombre']
    readonly_fields = ['creado']


@admin.register(Ingreso)
class IngresoAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'categoria', 'monto', 'organization', 'creado_por']
    list_filter = ['organization', 'categoria', 'fecha']
    search_fields = ['descripcion', 'organization__nombre']
    readonly_fields = ['creado', 'actualizado', 'creado_por']
    fieldsets = (
        ('Información básica', {'fields': ('organization', 'categoria', 'monto', 'fecha')}),
        ('Detalles', {'fields': ('descripcion',)}),
        ('Auditoría', {'fields': ('creado_por', 'creado', 'actualizado')}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)


@admin.register(CategoriaGasto)
class CategoriaGastoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'organization', 'icono', 'creado']
    list_filter = ['organization', 'creado']
    search_fields = ['nombre', 'organization__nombre']
    readonly_fields = ['creado']


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'categoria', 'monto', 'organization', 'creado_por']
    list_filter = ['organization', 'categoria', 'fecha']
    search_fields = ['descripcion', 'organization__nombre']
    readonly_fields = ['creado', 'actualizado', 'creado_por']
    fieldsets = (
        ('Información básica', {'fields': ('organization', 'categoria', 'monto', 'fecha')}),
        ('Detalles', {'fields': ('descripcion',)}),
        ('Auditoría', {'fields': ('creado_por', 'creado', 'actualizado')}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)
