from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from calendar import monthrange

from cotizador_project.mixins import OrganizationFilterMixin
from cotizador_project.permissions import HasRolPermission
from .models import CategoriaIngreso, Ingreso, CategoriaGasto, Gasto
from .serializers import (
    CategoriaIngresoSerializer, IngresoSerializer,
    CategoriaGastoSerializer, GastoSerializer,
    DashboardResumenSerializer, ResumenPorCategoriaSerializer
)


class CategoriaIngresoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Categorías de ingresos"""

    queryset = CategoriaIngreso.objects.all()
    serializer_class = CategoriaIngresoSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = []
    search_fields = ['nombre']


class IngresoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Ingresos/transacciones de ingreso"""

    queryset = Ingreso.objects.all()
    serializer_class = IngresoSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['categoria', 'fecha']
    search_fields = ['descripcion']
    ordering_fields = ['fecha', 'monto', 'creado']
    ordering = ['-fecha']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )


class CategoriaGastoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Categorías de gastos"""

    queryset = CategoriaGasto.objects.all()
    serializer_class = CategoriaGastoSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = []
    search_fields = ['nombre']


class GastoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Gastos/transacciones de egreso"""

    queryset = Gasto.objects.all()
    serializer_class = GastoSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['categoria', 'fecha']
    search_fields = ['descripcion']
    ordering_fields = ['fecha', 'monto', 'creado']
    ordering = ['-fecha']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )


class FinanzasDashboardView(APIView):
    """Dashboard con resumen de finanzas (últimos 12 meses)"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        today = timezone.now().date()

        # Calcular los últimos 12 meses
        resumen = []
        for i in range(11, -1, -1):
            # Restar i meses del año/mes actual
            if i == 0:
                year = today.year
                month = today.month
            else:
                total_months = today.year * 12 + today.month - i
                year = (total_months - 1) // 12
                month = ((total_months - 1) % 12) + 1

            # Primer y último día del mes
            mes_start = date(year, month, 1)
            last_day = monthrange(year, month)[1]
            mes_end = date(year, month, last_day)

            total_ingresos = Ingreso.objects.filter(
                organization=org,
                fecha__gte=mes_start,
                fecha__lte=mes_end
            ).aggregate(Sum('monto'))['monto__sum'] or Decimal('0')

            total_gastos = Gasto.objects.filter(
                organization=org,
                fecha__gte=mes_start,
                fecha__lte=mes_end
            ).aggregate(Sum('monto'))['monto__sum'] or Decimal('0')

            ganancia = total_ingresos - total_gastos

            resumen.append({
                'mes': mes_start.strftime('%Y-%m'),
                'total_ingresos': total_ingresos,
                'total_gastos': total_gastos,
                'ganancia': ganancia,
            })

        # Ordenar de más antiguo a más reciente
        resumen.reverse()
        serializer = DashboardResumenSerializer(resumen, many=True)
        return Response(serializer.data)


class ResumenPorCategoriaView(APIView):
    """Resumen desglosado por categoría (ingresos)"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        periodo = request.query_params.get('periodo', 'mes')  # 'mes' o 'año'

        if periodo == 'año':
            start_date = timezone.now().date().replace(month=1, day=1)
        else:
            start_date = timezone.now().date().replace(day=1)

        categorias = CategoriaIngreso.objects.filter(organization=org)
        total_ingresos = Ingreso.objects.filter(
            organization=org,
            fecha__gte=start_date
        ).aggregate(Sum('monto'))['monto__sum'] or Decimal('0')

        resumen = []
        for cat in categorias:
            monto = Ingreso.objects.filter(
                organization=org,
                categoria=cat,
                fecha__gte=start_date
            ).aggregate(Sum('monto'))['monto__sum'] or Decimal('0')

            porcentaje = Decimal('0')
            if total_ingresos > 0:
                porcentaje = (monto / total_ingresos * 100).quantize(Decimal('0.01'))

            resumen.append({
                'categoria': cat.nombre,
                'total': monto,
                'porcentaje': porcentaje,
            })

        serializer = ResumenPorCategoriaSerializer(resumen, many=True)
        return Response(serializer.data)
