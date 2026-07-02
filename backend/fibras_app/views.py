from datetime import date, timedelta
from decimal import Decimal

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cotizador_project.mixins import OrganizationFilterMixin
from cotizador_project.permissions import HasRolPermission
from .models import Fibra, SimulacionInversion
from .serializers import (
    FibraSerializer, PrecioHistoricoSerializer, DividendoHistoricoSerializer,
    SimularSerializer, SimulacionInversionSerializer,
)
from .services import queries
from .services.simulacion import calcular_crecimiento, calcular_dividendos_proyectados, comparar_fibras, SimulacionError


class FibraViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo de FIBRAs: dato de mercado público, solo lectura, sin filtro de organización."""

    queryset = Fibra.objects.filter(activo=True)
    serializer_class = FibraSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'ticker'
    lookup_value_regex = r'[^/]+'  # el default de DRF excluye '.', pero los tickers .MX lo necesitan
    search_fields = ['ticker', 'nombre']

    @action(detail=True, methods=['get'])
    def historico(self, request, ticker=None):
        fibra = self.get_object()
        desde = request.query_params.get('desde')
        fecha_inicio = date.fromisoformat(desde) if desde else date.today() - timedelta(days=365 * 5)
        precios = fibra.precios.filter(fecha__gte=fecha_inicio).order_by('fecha')
        return Response(PrecioHistoricoSerializer(precios, many=True).data)

    @action(detail=True, methods=['get'])
    def dividendos(self, request, ticker=None):
        fibra = self.get_object()
        desde = request.query_params.get('desde')
        fecha_inicio = date.fromisoformat(desde) if desde else date.today() - timedelta(days=365 * 5)
        dividendos = fibra.dividendos.filter(fecha_pago__gte=fecha_inicio).order_by('fecha_pago')
        return Response(DividendoHistoricoSerializer(dividendos, many=True).data)


class SimularView(APIView):
    """Ejecuta una simulación de inversión sin persistirla."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        entrada = SimularSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        try:
            resultados_por_ticker = {}
            for ticker in datos['tickers']:
                queries.obtener_fibra_o_error(ticker)
                precios = queries.cargar_precios(ticker, datos['fecha_inicio'], datos['fecha_fin'])
                dividendos = queries.cargar_dividendos(ticker, datos['fecha_inicio'], datos['fecha_fin'])
                resultado = calcular_crecimiento(
                    precios=precios,
                    dividendos=dividendos,
                    monto_inicial=datos['monto_inicial'],
                    fecha_inicio=datos['fecha_inicio'],
                    fecha_fin=datos['fecha_fin'],
                    reinvertir_dividendos=datos['reinvertir_dividendos'],
                    aportacion_periodica=datos.get('aportacion_periodica'),
                    frecuencia_aportacion=datos.get('frecuencia_aportacion'),
                )
                proyeccion = calcular_dividendos_proyectados(
                    dividendos=dividendos,
                    certificados=resultado['certificados_finales'],
                    hoy=datos['fecha_fin'],
                )
                resultado['proyeccion_dividendos'] = proyeccion
                resultados_por_ticker[ticker] = resultado
        except SimulacionError as exc:
            return Response({'detail': str(exc)}, status=422)

        respuesta = {
            'parametros_efectivos': {
                'tickers': datos['tickers'],
                'monto_inicial': datos['monto_inicial'],
                'fecha_inicio': datos['fecha_inicio'].isoformat(),
                'fecha_fin': datos['fecha_fin'].isoformat(),
                'reinvertir_dividendos': datos['reinvertir_dividendos'],
                'aportacion_periodica': datos.get('aportacion_periodica'),
                'frecuencia_aportacion': datos.get('frecuencia_aportacion'),
            },
            'resultados_por_fibra': resultados_por_ticker,
        }
        if len(resultados_por_ticker) > 1:
            respuesta['serie_comparacion'] = comparar_fibras(resultados_por_ticker)

        return Response(respuesta)


class SimulacionInversionViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """Historial de simulaciones guardadas por la organización."""

    queryset = SimulacionInversion.objects.all()
    serializer_class = SimulacionInversionSerializer
    permission_classes = [IsAuthenticated, HasRolPermission]
    permiso_por_accion = {
        'create': 'crear', 'destroy': 'eliminar',
    }
    ordering = ['-creado']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user,
        )
