from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'catalogo', views.FibraViewSet, basename='fibra')
router.register(r'simulaciones', views.SimulacionInversionViewSet, basename='simulacion-inversion')

urlpatterns = [
    path('simular/', views.SimularView.as_view(), name='fibras-simular'),
    path('', include(router.urls)),
]
