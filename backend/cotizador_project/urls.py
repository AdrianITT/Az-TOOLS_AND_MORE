from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'clientes', views.ClienteViewSet, basename='cliente')
router.register(r'servicios', views.ServicioViewSet, basename='servicio')
router.register(r'cotizaciones', views.CotizacionViewSet, basename='cotizacion')
router.register(r'items', views.ItemCotizacionViewSet, basename='item')
router.register(r'usuarios', views.UserViewSet, basename='usuario')
router.register(r'invitaciones', views.InvitacionViewSet, basename='invitacion')

urlpatterns = [
    path('auth/login/', obtain_auth_token, name='api_token_auth'),
    path('invitaciones/aceptar/', views.AceptarInvitacionView.as_view(), name='aceptar_invitacion'),
    path('reportes/resumen/', views.ReporteResumenView.as_view(), name='reporte_resumen'),
    path('', include(router.urls)),
]
