from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'clientes', views.ClienteViewSet, basename='cliente')
router.register(r'sucursales', views.SucursalViewSet, basename='sucursal')
router.register(r'servicios', views.ServicioViewSet, basename='servicio')
router.register(r'atributos-plantilla', views.AtributoPlantillaViewSet, basename='atributo-plantilla')
router.register(r'cotizaciones', views.CotizacionViewSet, basename='cotizacion')
router.register(r'items', views.CotizacionDetalleViewSet, basename='item')
router.register(r'usuarios', views.UserViewSet, basename='usuario')
router.register(r'invitaciones', views.InvitacionViewSet, basename='invitacion')

urlpatterns = [
    path('auth/login/', obtain_auth_token, name='api_token_auth'),
    path('auth/me/', views.MeView.as_view(), name='auth_me'),
    path('organizaciones/registro/', views.RegistroOrganizacionView.as_view(), name='registro_organizacion'),
    path('organizacion/', views.OrganizacionActualView.as_view(), name='organizacion_actual'),
    path('invitaciones/aceptar/', views.AceptarInvitacionView.as_view(), name='aceptar_invitacion'),
    path('publico/cotizaciones/<str:token>/', views.CotizacionPublicaView.as_view(), name='cotizacion_publica'),
    path('publico/cotizaciones/<str:token>/pdf/', views.CotizacionPublicaPdfView.as_view(), name='cotizacion_publica_pdf'),
    path('reportes/resumen/', views.ReporteResumenView.as_view(), name='reporte_resumen'),
    path('', include(router.urls)),
]
