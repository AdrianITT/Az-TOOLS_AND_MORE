from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from cotizador_project.models import Organization, User
from fibras_app.models import Fibra, PrecioHistorico, DividendoHistorico
from fibras_app.services.simulacion import (
    PuntoPrecio, Dividendo, calcular_crecimiento, calcular_dividendos_proyectados,
    comparar_fibras, SimulacionError,
)


class MotorSimulacionTests(TestCase):
    """Motor de simulación con datos sintéticos, sin tocar el ORM ni la red."""

    def test_crecimiento_sin_reinversion_ni_dividendos(self):
        precios = [
            PuntoPrecio(date(2024, 1, 1), Decimal('10')),
            PuntoPrecio(date(2024, 12, 31), Decimal('12')),
        ]
        resultado = calcular_crecimiento(
            precios=precios,
            dividendos=[],
            monto_inicial=Decimal('1000'),
            fecha_inicio=date(2024, 1, 1),
            fecha_fin=date(2024, 12, 31),
            reinvertir_dividendos=False,
        )
        # 1000 / 10 = 100 certificados; valor final = 100 * 12 = 1200
        self.assertEqual(resultado['valor_final'], Decimal('1200.00'))
        self.assertEqual(resultado['total_aportado'], Decimal('1000.00'))
        self.assertEqual(resultado['dividendos_totales'], Decimal('0.00'))

    def test_reinversion_de_dividendos_aumenta_certificados(self):
        precios = [
            PuntoPrecio(date(2024, 1, 1), Decimal('10')),
            PuntoPrecio(date(2024, 6, 15), Decimal('10')),
            PuntoPrecio(date(2024, 12, 31), Decimal('10')),
        ]
        dividendos = [Dividendo(date(2024, 6, 15), Decimal('1'))]  # $1/certificado

        sin_reinversion = calcular_crecimiento(
            precios=precios, dividendos=dividendos, monto_inicial=Decimal('1000'),
            fecha_inicio=date(2024, 1, 1), fecha_fin=date(2024, 12, 31),
            reinvertir_dividendos=False,
        )
        con_reinversion = calcular_crecimiento(
            precios=precios, dividendos=dividendos, monto_inicial=Decimal('1000'),
            fecha_inicio=date(2024, 1, 1), fecha_fin=date(2024, 12, 31),
            reinvertir_dividendos=True,
        )
        # Sin reinversión: 100 certificados fijos, precio final 10 -> valor 1000
        self.assertEqual(sin_reinversion['valor_final'], Decimal('1000.00'))
        self.assertEqual(sin_reinversion['dividendos_totales'], Decimal('100.00'))
        # Con reinversión: 100 certificados + (100*1)/10 = 10 extra = 110 -> valor 1100
        self.assertEqual(con_reinversion['valor_final'], Decimal('1100.00'))
        self.assertGreater(con_reinversion['certificados_finales'], Decimal('100'))

    def test_aportacion_periodica_mensual_incrementa_total_aportado(self):
        precios = [PuntoPrecio(date(2024, 1, 1) if i == 0 else date(2024, 1, 1).replace(month=min(i + 1, 12)), Decimal('10')) for i in range(6)]
        resultado = calcular_crecimiento(
            precios=precios, dividendos=[], monto_inicial=Decimal('1000'),
            fecha_inicio=date(2024, 1, 1), fecha_fin=date(2024, 6, 1),
            reinvertir_dividendos=False,
            aportacion_periodica=Decimal('100'),
            frecuencia_aportacion='mensual',
        )
        self.assertGreater(resultado['total_aportado'], Decimal('1000'))
        self.assertGreater(resultado['certificados_finales'], Decimal('100'))

    def test_sin_precios_lanza_error(self):
        with self.assertRaises(SimulacionError):
            calcular_crecimiento(
                precios=[], dividendos=[], monto_inicial=Decimal('1000'),
                fecha_inicio=date(2024, 1, 1), fecha_fin=date(2024, 12, 31),
                reinvertir_dividendos=False,
            )

    def test_dividendos_proyectados_promedia_ultimos_12_meses(self):
        dividendos = [
            Dividendo(date(2024, 3, 1), Decimal('0.5')),
            Dividendo(date(2024, 9, 1), Decimal('0.5')),
        ]
        proyeccion = calcular_dividendos_proyectados(
            dividendos=dividendos, certificados=Decimal('100'), hoy=date(2024, 12, 1),
        )
        # (0.5+0.5)*100 / 12 meses = 8.33 mensual
        self.assertEqual(proyeccion['mensual_estimado'], Decimal('8.33'))

    def test_comparar_fibras_hace_forward_fill(self):
        resultados = {
            'A': {'serie_valor': [{'fecha': '2024-01-01', 'valor': Decimal('100')}, {'fecha': '2024-02-01', 'valor': Decimal('110')}]},
            'B': {'serie_valor': [{'fecha': '2024-01-01', 'valor': Decimal('100')}]},
        }
        serie = comparar_fibras(resultados)
        punto_feb = next(p for p in serie if p['fecha'] == '2024-02-01')
        self.assertEqual(punto_feb['B'], Decimal('100'))  # forward-filled


class SimularEndpointTests(TestCase):
    """Prueba end-to-end del endpoint /api/fibras/simular/ contra datos precargados en SQLite (sin red)."""

    def setUp(self):
        self.org = Organization.objects.create(nombre='Org Test')
        self.user = User.objects.create_user(username='tester', password='pass1234', organization=self.org, rol='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        self.fibra = Fibra.objects.create(ticker='TEST11.MX', nombre='Test FIBRA', activo=True)
        PrecioHistorico.objects.create(fibra=self.fibra, fecha=date(2024, 1, 1), precio_cierre=Decimal('10'))
        PrecioHistorico.objects.create(fibra=self.fibra, fecha=date(2024, 12, 31), precio_cierre=Decimal('15'))
        DividendoHistorico.objects.create(fibra=self.fibra, fecha_pago=date(2024, 6, 1), monto_por_certificado=Decimal('0.5'))

    def test_catalogo_detalle_con_ticker_con_punto(self):
        # El lookup por defecto de DRF excluye '.', pero los tickers .MX lo necesitan.
        resp = self.client.get('/api/fibras/catalogo/TEST11.MX/')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data['ticker'], 'TEST11.MX')

        resp_historico = self.client.get('/api/fibras/catalogo/TEST11.MX/historico/')
        self.assertEqual(resp_historico.status_code, 200, resp_historico.content)
        self.assertEqual(len(resp_historico.data), 2)

        resp_dividendos = self.client.get('/api/fibras/catalogo/TEST11.MX/dividendos/')
        self.assertEqual(resp_dividendos.status_code, 200, resp_dividendos.content)
        self.assertEqual(len(resp_dividendos.data), 1)

    def test_simular_endpoint_devuelve_resultado(self):
        resp = self.client.post('/api/fibras/simular/', {
            'tickers': ['TEST11.MX'],
            'monto_inicial': '1000',
            'fecha_inicio': '2024-01-01',
            'fecha_fin': '2024-12-31',
            'reinvertir_dividendos': True,
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        resultado = resp.data['resultados_por_fibra']['TEST11.MX']
        self.assertIn('valor_final', resultado)
        self.assertIn('proyeccion_dividendos', resultado)

    def test_simular_endpoint_ticker_inexistente_devuelve_422(self):
        resp = self.client.post('/api/fibras/simular/', {
            'tickers': ['NOEXISTE.MX'],
            'monto_inicial': '1000',
            'fecha_inicio': '2024-01-01',
            'fecha_fin': '2024-12-31',
            'reinvertir_dividendos': False,
        }, format='json')
        self.assertEqual(resp.status_code, 422)

    def test_guardar_y_listar_historial(self):
        resp = self.client.post('/api/fibras/simulaciones/', {
            'nombre': 'Mi simulación',
            'tipo': 'simple',
            'parametros': {'tickers': ['TEST11.MX']},
            'resultado': {'valor_final': '1500.00'},
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)

        listado = self.client.get('/api/fibras/simulaciones/')
        self.assertEqual(listado.status_code, 200)
        self.assertEqual(listado.data['count'], 1)
