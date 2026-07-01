from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Cliente,
    Cotizacion,
    Invitacion,
    ItemCotizacion,
    Organization,
    PastelServicio,
    Servicio,
    TapiceriaServicio,
    User,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'plan', 'activo', 'fecha_registro']
    list_filter = ['plan', 'activo']
    search_fields = ['nombre', 'ruc', 'email']


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Organización', {
            'fields': (
                'organization', 'rol', 'activo',
                'puede_crear_cotizaciones', 'puede_eliminar_cotizaciones',
                'puede_ver_reportes', 'puede_gestionar_usuarios',
            )
        }),
    )
    list_display = ['username', 'email', 'organization', 'rol', 'is_active']
    list_filter = ['organization', 'rol']


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'organization', 'tipo', 'email', 'activo']
    list_filter = ['organization', 'tipo', 'activo']
    search_fields = ['nombre', 'email']


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'organization', 'tipo', 'precio_base', 'activo']
    list_filter = ['organization', 'tipo', 'activo']
    search_fields = ['nombre']


@admin.register(PastelServicio)
class PastelServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'organization', 'sabor', 'pisos', 'precio_base']
    list_filter = ['organization']


@admin.register(TapiceriaServicio)
class TapiceriaServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'organization', 'material', 'medidas', 'precio_base']
    list_filter = ['organization']


class ItemCotizacionInline(admin.TabularInline):
    model = ItemCotizacion
    extra = 1


@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = ['numero', 'organization', 'cliente', 'estado', 'total', 'creado']
    list_filter = ['organization', 'estado']
    search_fields = ['numero', 'cliente__nombre']
    inlines = [ItemCotizacionInline]


@admin.register(Invitacion)
class InvitacionAdmin(admin.ModelAdmin):
    list_display = ['email', 'organization', 'rol', 'estado', 'creado', 'expira']
    list_filter = ['organization', 'estado', 'rol']
    search_fields = ['email']
