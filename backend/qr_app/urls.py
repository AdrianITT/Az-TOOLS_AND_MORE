from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CodigoQRViewSet

router = DefaultRouter()
router.register(r'codigos', CodigoQRViewSet, basename='qr')

urlpatterns = [
    path('', include(router.urls)),
]
