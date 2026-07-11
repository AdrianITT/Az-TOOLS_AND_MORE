"""Tests del parsing de recibos (texto → datos). No requieren imágenes ni BD."""
from django.test import SimpleTestCase

from .services.ocr_recibos import detectar_comercio, detectar_fecha, detectar_monto

TICKET_OXXO = """OXXO SUC CENTRO
AV JUAREZ 123 COL CENTRO
10/07/2026 14:32
COCA COLA 600ML       $18.50
SABRITAS ORIGINAL     $17.00
SUBTOTAL              $35.50
IVA                    $5.68
TOTAL                 $41.18
GRACIAS POR SU COMPRA
"""

TICKET_SIN_ETIQUETA = """FERRETERIA EL MARTILLO
Clavos 1kg    120.00
Martillo      285.50
             405,50
10 JUL 2026
"""

TICKET_MILES = """HOME DEPOT MEXICO
FECHA: 08-07-2026
TALADRO INDUSTRIAL
TOTAL A PAGAR $ 1,234.56
"""

TICKET_ILEGIBLE = """;;;###***
!!! ???
"""


class DetectarMontoTests(SimpleTestCase):
    def test_total_con_etiqueta(self):
        self.assertEqual(detectar_monto(TICKET_OXXO), '41.18')

    def test_ignora_subtotal(self):
        # La línea SUBTOTAL no debe ganarle al TOTAL
        self.assertEqual(detectar_monto(TICKET_OXXO), '41.18')

    def test_sin_etiqueta_toma_el_mayor(self):
        self.assertEqual(detectar_monto(TICKET_SIN_ETIQUETA), '405.50')

    def test_separador_de_miles(self):
        self.assertEqual(detectar_monto(TICKET_MILES), '1234.56')

    def test_ilegible_devuelve_none(self):
        self.assertIsNone(detectar_monto(TICKET_ILEGIBLE))


class DetectarFechaTests(SimpleTestCase):
    def test_formato_ddmmyyyy(self):
        self.assertEqual(detectar_fecha(TICKET_OXXO), '2026-07-10')

    def test_formato_texto(self):
        self.assertEqual(detectar_fecha(TICKET_SIN_ETIQUETA), '2026-07-10')

    def test_formato_con_guiones(self):
        self.assertEqual(detectar_fecha(TICKET_MILES), '2026-07-08')

    def test_ilegible_devuelve_none(self):
        self.assertIsNone(detectar_fecha(TICKET_ILEGIBLE))

    def test_fecha_futura_descartada(self):
        self.assertIsNone(detectar_fecha('VENCE 31/12/2099'))


class DetectarComercioTests(SimpleTestCase):
    def test_primera_linea_con_letras(self):
        self.assertEqual(detectar_comercio(TICKET_OXXO), 'OXXO SUC CENTRO')

    def test_salta_lineas_de_simbolos(self):
        texto = '123456789\n$$$###\nABARROTES DONA MARI\n'
        self.assertEqual(detectar_comercio(texto), 'ABARROTES DONA MARI')

    def test_ilegible_devuelve_none(self):
        self.assertIsNone(detectar_comercio(TICKET_ILEGIBLE))
