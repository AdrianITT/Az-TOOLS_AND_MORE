from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categorias-ingresos', views.CategoriaIngresoViewSet, basename='categoria-ingreso')
router.register(r'ingresos', views.IngresoViewSet, basename='ingreso')
router.register(r'categorias-gastos', views.CategoriaGastoViewSet, basename='categoria-gasto')
router.register(r'gastos', views.GastoViewSet, basename='gasto')
router.register(r'categorias-deudas', views.CategoriaDeudaViewSet, basename='categoria-deuda')
router.register(r'deudas', views.DeudaViewSet, basename='deuda')

urlpatterns = [
    path('dashboard/', views.FinanzasDashboardView.as_view(), name='finanzas-dashboard'),
    path('dashboard/detalle-mes/', views.DetalleMesView.as_view(), name='finanzas-detalle-mes'),
    path('resumen-por-categoria/', views.ResumenPorCategoriaView.as_view(), name='resumen-por-categoria'),
    path('gastos-por-dia/', views.GastosPorDiaView.as_view(), name='gastos-por-dia'),
    path('', include(router.urls)),
]
