from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
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
from .models import CategoriaIngreso, Ingreso, CategoriaGasto, Gasto, CategoriaDeuda, Deuda, PagoDeuda
from .serializers import (
    CategoriaIngresoSerializer, IngresoSerializer,
    CategoriaGastoSerializer, GastoSerializer,
    DashboardResumenSerializer, ResumenPorCategoriaSerializer,
    MovimientoDetalleSerializer, GastoPorDiaSerializer,
    CategoriaDeudaSerializer, DeudaSerializer, PagoDeudaSerializer,
    DeudaResumenSerializer, ProximoVencimientoSerializer,
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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('sin_pago_deuda') == 'true':
            qs = qs.filter(pagos_deuda__isnull=True)
        return qs


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
    """Resumen desglosado por categoría (ingresos o gastos, según `tipo`)"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        periodo = request.query_params.get('periodo', 'mes')  # 'mes' o 'año'
        tipo = request.query_params.get('tipo', 'ingresos')  # 'ingresos' o 'gastos'

        if tipo not in ('ingresos', 'gastos'):
            raise ValidationError({'tipo': 'Debe ser "ingresos" o "gastos".'})

        if periodo == 'año':
            start_date = timezone.now().date().replace(month=1, day=1)
        else:
            start_date = timezone.now().date().replace(day=1)

        CategoriaModel = CategoriaIngreso if tipo == 'ingresos' else CategoriaGasto
        MovimientoModel = Ingreso if tipo == 'ingresos' else Gasto

        categorias = CategoriaModel.objects.filter(organization=org)
        total_general = MovimientoModel.objects.filter(
            organization=org,
            fecha__gte=start_date
        ).aggregate(Sum('monto'))['monto__sum'] or Decimal('0')

        resumen = []
        for cat in categorias:
            monto = MovimientoModel.objects.filter(
                organization=org,
                categoria=cat,
                fecha__gte=start_date
            ).aggregate(Sum('monto'))['monto__sum'] or Decimal('0')

            porcentaje = Decimal('0')
            if total_general > 0:
                porcentaje = (monto / total_general * 100).quantize(Decimal('0.01'))

            resumen.append({
                'categoria': cat.nombre,
                'total': monto,
                'porcentaje': porcentaje,
            })

        resumen.sort(key=lambda r: r['total'], reverse=True)
        serializer = ResumenPorCategoriaSerializer(resumen, many=True)
        return Response(serializer.data)


class DetalleMesView(APIView):
    """Detalle de movimientos (ingresos + gastos) de un mes puntual, para el drill-down del Resumen Mensual"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        mes = request.query_params.get('mes')  # formato 'YYYY-MM'
        if not mes:
            raise ValidationError({'mes': 'Parámetro requerido, formato YYYY-MM.'})
        try:
            year, month = (int(p) for p in mes.split('-'))
            mes_start = date(year, month, 1)
        except (ValueError, TypeError):
            raise ValidationError({'mes': 'Formato inválido, debe ser YYYY-MM.'})

        last_day = monthrange(year, month)[1]
        mes_end = date(year, month, last_day)

        ingresos = Ingreso.objects.filter(
            organization=org, fecha__gte=mes_start, fecha__lte=mes_end
        ).select_related('categoria')
        gastos = Gasto.objects.filter(
            organization=org, fecha__gte=mes_start, fecha__lte=mes_end
        ).select_related('categoria')

        movimientos = [
            {
                'tipo': 'ingreso',
                'fecha': i.fecha,
                'categoria': i.categoria.nombre,
                'monto': i.monto,
                'descripcion': i.descripcion,
            }
            for i in ingresos
        ] + [
            {
                'tipo': 'gasto',
                'fecha': g.fecha,
                'categoria': g.categoria.nombre,
                'monto': g.monto,
                'descripcion': g.descripcion,
            }
            for g in gastos
        ]
        movimientos.sort(key=lambda m: m['fecha'], reverse=True)

        serializer = MovimientoDetalleSerializer(movimientos, many=True)
        return Response(serializer.data)


class GastosPorDiaView(APIView):
    """Días con mayor gasto en el período seleccionado (mes actual o año actual)"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        periodo = request.query_params.get('periodo', 'mes')  # 'mes' o 'año'

        if periodo == 'año':
            start_date = timezone.now().date().replace(month=1, day=1)
        else:
            start_date = timezone.now().date().replace(day=1)

        resumen = (
            Gasto.objects.filter(organization=org, fecha__gte=start_date)
            .values('fecha')
            .annotate(total=Sum('monto'))
            .order_by('-total')[:10]
        )
        data = [{'fecha': r['fecha'], 'total': r['total']} for r in resumen]
        serializer = GastoPorDiaSerializer(data, many=True)
        return Response(serializer.data)


# ─── Deudas ───────────────────────────────────────────────────────────────────

class CategoriaDeudaViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    queryset = CategoriaDeuda.objects.all()
    serializer_class = CategoriaDeudaSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    search_fields = ['nombre']


class DeudaViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    queryset = Deuda.objects.select_related('categoria').all()
    serializer_class = DeudaSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['estado', 'categoria']
    search_fields = ['acreedor', 'notas']
    ordering_fields = ['creado', 'saldo_actual', 'fecha_vencimiento']
    ordering = ['-creado']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )

    @action(detail=True, methods=['get', 'post'], url_path='pagos')
    def pagos(self, request, pk=None):
        deuda = self.get_object()

        if request.method == 'GET':
            pagos = deuda.pagos.prefetch_related('gastos_cubiertos__categoria').all()
            serializer = PagoDeudaSerializer(pagos, many=True)
            return Response(serializer.data)

        # POST — registrar un pago
        serializer = PagoDeudaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        monto = serializer.validated_data['monto']
        gastos_cubiertos = serializer.validated_data.get('gastos_cubiertos', [])

        # Validar que los gastos no estén ya cubiertos por otro pago
        for gasto in gastos_cubiertos:
            if gasto.pagos_deuda.exclude(deuda=deuda).exists():
                raise ValidationError(
                    f'El gasto #{gasto.id} ya está cubierto por otro pago de deuda.'
                )

        # Calcular saldo resultante (mínimo 0)
        nuevo_saldo = max(deuda.saldo_actual - monto, Decimal('0'))

        pago = PagoDeuda.objects.create(
            deuda=deuda,
            fecha=serializer.validated_data['fecha'],
            monto=monto,
            saldo_resultante=nuevo_saldo,
            notas=serializer.validated_data.get('notas', ''),
            creado_por=request.user,
        )
        if gastos_cubiertos:
            pago.gastos_cubiertos.set(gastos_cubiertos)

        deuda.saldo_actual = nuevo_saldo
        if nuevo_saldo == 0 and deuda.categoria.tipo_amortizacion == 'cuotas_fijas':
            deuda.estado = 'pagada'
        deuda.save()

        return Response(PagoDeudaSerializer(pago).data, status=201)

    @action(detail=False, methods=['get'], url_path='resumen')
    def resumen(self, request):
        org = request.user.organization
        deudas_activas = Deuda.objects.filter(organization=org, estado='activa')
        total = deudas_activas.aggregate(total=Sum('saldo_actual'))['total'] or Decimal('0')

        por_categoria = (
            deudas_activas
            .values('categoria__nombre', 'categoria__color')
            .annotate(total=Sum('saldo_actual'))
            .order_by('-total')
        )
        data = {
            'total_deuda': total,
            'por_categoria': [
                {
                    'categoria': r['categoria__nombre'],
                    'color': r['categoria__color'],
                    'total': str(r['total']),
                }
                for r in por_categoria
            ],
        }
        return Response(data)

    @action(detail=False, methods=['get'], url_path='proximos-vencimientos')
    def proximos_vencimientos(self, request):
        org = request.user.organization
        dias = int(request.query_params.get('dias', 30))
        hoy = timezone.now().date()
        limite = hoy + timedelta(days=dias)

        deudas = Deuda.objects.filter(
            organization=org,
            estado='activa',
        ).select_related('categoria').filter(
            fecha_vencimiento__isnull=False,
            fecha_vencimiento__lte=limite,
        ).order_by('fecha_vencimiento')

        data = [
            {
                'deuda_id': d.id,
                'acreedor': d.acreedor,
                'categoria': d.categoria.nombre,
                'categoria_color': d.categoria.color,
                'saldo_actual': d.saldo_actual,
                'fecha_vencimiento': d.fecha_vencimiento,
                'dias_restantes': (d.fecha_vencimiento - hoy).days,
            }
            for d in deudas
        ]
        serializer = ProximoVencimientoSerializer(data, many=True)
        return Response(serializer.data)
