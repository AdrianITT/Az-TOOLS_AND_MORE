"""Puente entre el ORM (Fibra/PrecioHistorico/DividendoHistorico) y las
estructuras planas que consume services/simulacion.py.
"""
from datetime import date

from ..models import Fibra, PrecioHistorico, DividendoHistorico
from .simulacion import PuntoPrecio, Dividendo, SimulacionError


def cargar_precios(ticker: str, fecha_inicio: date, fecha_fin: date) -> list[PuntoPrecio]:
    qs = PrecioHistorico.objects.filter(
        fibra__ticker=ticker,
        fecha__lte=fecha_fin,
    ).order_by('fecha')
    return [PuntoPrecio(fecha=p.fecha, precio=p.precio_cierre) for p in qs]


def cargar_dividendos(ticker: str, fecha_inicio: date, fecha_fin: date) -> list[Dividendo]:
    qs = DividendoHistorico.objects.filter(
        fibra__ticker=ticker,
        fecha_pago__lte=fecha_fin,
    ).order_by('fecha_pago')
    return [Dividendo(fecha=d.fecha_pago, monto_por_certificado=d.monto_por_certificado) for d in qs]


def obtener_fibra_o_error(ticker: str) -> Fibra:
    try:
        return Fibra.objects.get(ticker=ticker, activo=True)
    except Fibra.DoesNotExist:
        raise SimulacionError(f"FIBRA '{ticker}' no encontrada o inactiva.")
