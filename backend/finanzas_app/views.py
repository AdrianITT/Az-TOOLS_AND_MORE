from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
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
from .models import CategoriaIngreso, Ingreso, CategoriaGasto, Gasto, CategoriaDeuda, Deuda, PagoDeuda, Recibo
from .serializers import (
    CategoriaIngresoSerializer, IngresoSerializer,
    CategoriaGastoSerializer, GastoSerializer,
    DashboardResumenSerializer, ResumenPorCategoriaSerializer,
    MovimientoDetalleSerializer, GastoPorDiaSerializer,
    CategoriaDeudaSerializer, DeudaSerializer, PagoDeudaSerializer,
    DeudaResumenSerializer, ProximoVencimientoSerializer,
    ReciboSerializer,
)


class CategoriaIngresoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Categorías de ingresos"""

    queryset = CategoriaIngreso.objects.all()
    serializer_class = CategoriaIngresoSerializer
    pagination_class = None  # lista acotada: los selects necesitan todas
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = []
    search_fields = ['nombre']
    ordering = ['nombre']


class IngresoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Ingresos/transacciones de ingreso"""

    queryset = Ingreso.objects.all()
    serializer_class = IngresoSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
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
    pagination_class = None
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = []
    search_fields = ['nombre']
    ordering = ['nombre']


class GastoViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Gastos/transacciones de egreso"""

    queryset = Gasto.objects.all()
    serializer_class = GastoSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
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


class AnalizarRecibosView(APIView):
    """OCR de recibos/tickets: recibe imágenes, devuelve datos extraídos para
    que el usuario los revise y confirme. No guarda nada."""

    permission_classes = [IsAuthenticated]

    MAX_IMAGENES = 10
    MAX_TAMANO_MB = 5

    def post(self, request):
        from io import BytesIO
        from PIL import Image, UnidentifiedImageError
        from .services.ocr_recibos import analizar_recibo

        contexto = request.query_params.get('contexto', 'movimiento')
        if contexto not in ('movimiento', 'deuda'):
            raise ValidationError({'contexto': 'Debe ser "movimiento" o "deuda".'})

        imagenes = request.FILES.getlist('imagenes')
        if not imagenes:
            raise ValidationError({'imagenes': 'Subí al menos una imagen.'})
        if len(imagenes) > self.MAX_IMAGENES:
            raise ValidationError({'imagenes': f'Máximo {self.MAX_IMAGENES} imágenes por tanda.'})

        contenidos = []
        for f in imagenes:
            if f.size > self.MAX_TAMANO_MB * 1024 * 1024:
                raise ValidationError({'imagenes': f'"{f.name}" supera los {self.MAX_TAMANO_MB} MB.'})
            data = f.read()
            try:
                Image.open(BytesIO(data)).verify()
            except (UnidentifiedImageError, OSError):
                raise ValidationError({'imagenes': f'"{f.name}" no es una imagen válida.'})
            contenidos.append((data, f.name))

        resultados = [analizar_recibo(data, nombre, contexto=contexto) for data, nombre in contenidos]
        return Response(resultados)


class ExportarCSVView(APIView):
    """Exporta movimientos a CSV (con BOM para que Excel abra bien los acentos).

    ?tipo=ingresos | gastos | deudas | mensual
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        import csv
        from django.http import HttpResponse

        tipo = request.query_params.get('tipo', 'gastos')
        org = request.user.organization
        hoy = timezone.now().date().isoformat()

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{tipo}_{hoy}.csv"'
        response.write('\ufeff')  # BOM: Excel interpreta UTF-8 correctamente
        writer = csv.writer(response)

        if tipo == 'ingresos':
            writer.writerow(['Fecha', 'Categoría', 'Monto', 'Descripción', 'Cotización'])
            qs = Ingreso.objects.filter(organization=org).select_related('categoria', 'cotizacion').order_by('-fecha')
            for i in qs.iterator():
                writer.writerow([i.fecha, i.categoria.nombre, i.monto, i.descripcion or '', i.cotizacion.numero if i.cotizacion else ''])
        elif tipo == 'gastos':
            writer.writerow(['Fecha', 'Categoría', 'Monto', 'Descripción'])
            qs = Gasto.objects.filter(organization=org).select_related('categoria').order_by('-fecha')
            for g in qs.iterator():
                writer.writerow([g.fecha, g.categoria.nombre, g.monto, g.descripcion or ''])
        elif tipo == 'deudas':
            writer.writerow(['Acreedor', 'Categoría', 'Monto original', 'Saldo actual', 'Inicio', 'Vencimiento', 'Estado', 'Notas'])
            qs = Deuda.objects.filter(organization=org).select_related('categoria').order_by('-creado')
            for d in qs.iterator():
                writer.writerow([
                    d.acreedor, d.categoria.nombre, d.monto_original, d.saldo_actual,
                    d.fecha_inicio, d.fecha_vencimiento or '', d.get_estado_display(), d.notas or '',
                ])
        elif tipo == 'mensual':
            from django.db.models.functions import TruncMonth
            writer.writerow(['Mes', 'Ingresos', 'Gastos', 'Ganancia'])
            ing = dict(
                Ingreso.objects.filter(organization=org)
                .annotate(mes=TruncMonth('fecha')).values_list('mes')
                .annotate(t=Sum('monto')).values_list('mes', 't')
            )
            gas = dict(
                Gasto.objects.filter(organization=org)
                .annotate(mes=TruncMonth('fecha')).values_list('mes')
                .annotate(t=Sum('monto')).values_list('mes', 't')
            )
            for mes in sorted(set(ing) | set(gas), reverse=True):
                ti = ing.get(mes) or Decimal('0')
                tg = gas.get(mes) or Decimal('0')
                writer.writerow([mes.strftime('%Y-%m'), ti, tg, ti - tg])
        else:
            raise ValidationError({'tipo': 'Debe ser ingresos, gastos, deudas o mensual.'})

        return response


class FinanzasTotalesView(APIView):
    """Totales de todo el histórico, calculados en la BD.

    Los encabezados de las pestañas los usaban sumando la lista visible,
    que con paginación solo contiene la primera página — mentía a partir
    del registro 21."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization
        total_ingresos = Ingreso.objects.filter(organization=org).aggregate(t=Sum('monto'))['t'] or Decimal('0')
        total_gastos = Gasto.objects.filter(organization=org).aggregate(t=Sum('monto'))['t'] or Decimal('0')
        return Response({
            'total_ingresos': str(total_ingresos),
            'total_gastos': str(total_gastos),
        })


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

        def url_comprobante(mov):
            # Relativa a propósito: válida desde LAN y Tailscale por igual
            return mov.comprobante.url if mov.comprobante else None

        movimientos = [
            {
                'tipo': 'ingreso',
                'fecha': i.fecha,
                'categoria': i.categoria.nombre,
                'monto': i.monto,
                'descripcion': i.descripcion,
                'comprobante': url_comprobante(i),
            }
            for i in ingresos
        ] + [
            {
                'tipo': 'gasto',
                'fecha': g.fecha,
                'categoria': g.categoria.nombre,
                'monto': g.monto,
                'descripcion': g.descripcion,
                'comprobante': url_comprobante(g),
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
    pagination_class = None
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    search_fields = ['nombre']
    ordering = ['nombre']


class DeudaViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    queryset = Deuda.objects.select_related('categoria').all()
    serializer_class = DeudaSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
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
            comprobante=serializer.validated_data.get('comprobante'),
            creado_por=request.user,
        )
        if gastos_cubiertos:
            pago.gastos_cubiertos.set(gastos_cubiertos)

        deuda.saldo_actual = nuevo_saldo
        # Revolvente no se cierra automáticamente: su saldo fluctúa con nuevos cargos
        if nuevo_saldo == 0 and deuda.categoria.tipo_amortizacion in ('cuotas_fijas', 'cuenta_por_pagar'):
            deuda.estado = 'pagada'
        deuda.save()

        return Response(PagoDeudaSerializer(pago).data, status=201)

    @action(detail=False, methods=['get'], url_path='resumen')
    def resumen(self, request):
        org = request.user.organization
        deudas_activas = Deuda.objects.filter(organization=org, estado='activa', saldo_actual__gt=0)
        total = deudas_activas.aggregate(total=Sum('saldo_actual'))['total'] or Decimal('0')

        por_categoria = (
            deudas_activas
            .values('categoria__nombre', 'categoria__color')
            .annotate(total=Sum('saldo_actual'))
            .order_by('-total')
        )
        data = {
            'total_deuda': total,
            'deudas_activas': deudas_activas.count(),
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
            saldo_actual__gt=0,
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


class ReciboViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Recibos independientes — pagos/entregas con detalles de cliente y producto"""

    queryset = Recibo.objects.all()
    serializer_class = ReciboSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'update': 'editar',
        'partial_update': 'editar', 'destroy': 'eliminar',
    }
    filterset_fields = ['cliente', 'producto', 'fecha_creacion']
    search_fields = ['cliente_nombre', 'producto_nombre', 'descripcion']
    ordering_fields = ['fecha_creacion', 'monto_total', 'creado']
    ordering = ['-fecha_creacion']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )

    @action(detail=True, methods=['get'], url_path='pdf')
    def descargar_pdf(self, request, pk=None):
        """Descarga el recibo en PDF"""
        recibo = self.get_object()
        from django.http import HttpResponse
        from weasyprint import WeasyPrint
        from django.template.loader import render_to_string

        # Datos para el template
        cliente = recibo.cliente.nombre if recibo.cliente else recibo.cliente_nombre
        producto = recibo.producto.nombre if recibo.producto else recibo.producto_nombre
        logo_url = None
        if recibo.organization.logo:
            logo_url = request.build_absolute_uri(recibo.organization.logo.url)

        context = {
            'recibo': recibo,
            'cliente': cliente,
            'producto': producto,
            'creador': recibo.creado_por.get_full_name() if recibo.creado_por else 'Sistema',
            'empresa': recibo.organization.nombre,
            'logo_url': logo_url,
            'monto_restante': recibo.monto_total - recibo.monto_pagado,
        }

        html_string = render_to_string('recibo.html', context)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="recibo_{recibo.id}_{recibo.fecha_creacion}.pdf"'
        WeasyPrint(string=html_string, base_url=request.build_absolute_uri('/')).write_pdf(response)
        return response
