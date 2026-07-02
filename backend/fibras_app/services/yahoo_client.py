"""Cliente delgado contra los endpoints no oficiales de Yahoo Finance.

Implementa únicamente lo que sync_fibras necesita (OHLCV + dividendos para
tickers .MX de la BMV), en vez de depender de `yfinance` (que trae opciones,
noticias, financieros, etc. que este proyecto no usa). Si Yahoo endurece sus
requisitos anti-bot y este cliente deja de funcionar, la salida es reemplazar
este módulo por `yfinance`/`curl_cffi` sin tocar el resto de la app.
"""
import logging
import time
from datetime import date, datetime, timezone

import requests

logger = logging.getLogger('fibras_app')

CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}'
USER_AGENT = 'Mozilla/5.0 (compatible; AzToolsFibrasSync/1.0)'
REQUEST_TIMEOUT_SECONDS = 10


class YahooFinanceError(Exception):
    pass


def _fetch_chart(ticker: str, periodo1: int, periodo2: int) -> dict:
    params = {
        'period1': periodo1,
        'period2': periodo2,
        'interval': '1d',
        'events': 'div',
    }
    resp = requests.get(
        CHART_URL.format(ticker=ticker),
        params=params,
        headers={'User-Agent': USER_AGENT},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    resp.raise_for_status()
    data = resp.json()
    resultado = data.get('chart', {}).get('result')
    if not resultado:
        error = data.get('chart', {}).get('error')
        raise YahooFinanceError(f"Respuesta sin datos para {ticker}: {error}")
    return resultado[0]


def obtener_historial(ticker: str, fecha_inicio: date, fecha_fin: date) -> dict:
    """Devuelve dict con 'precios' (lista de dicts fecha/apertura/max/min/cierre/volumen)
    y 'dividendos' (lista de dicts fecha_pago/monto_por_certificado)."""
    periodo1 = int(datetime.combine(fecha_inicio, datetime.min.time(), tzinfo=timezone.utc).timestamp())
    periodo2 = int(datetime.combine(fecha_fin, datetime.min.time(), tzinfo=timezone.utc).timestamp())

    resultado = _fetch_chart(ticker, periodo1, periodo2)

    timestamps = resultado.get('timestamp') or []
    quote = resultado.get('indicators', {}).get('quote', [{}])[0]
    cierres = quote.get('close') or []
    aperturas = quote.get('open') or []
    maximos = quote.get('high') or []
    minimos = quote.get('low') or []
    volumenes = quote.get('volume') or []

    precios = []
    for i, ts in enumerate(timestamps):
        cierre = cierres[i] if i < len(cierres) else None
        if cierre is None:
            continue
        fecha = datetime.fromtimestamp(ts, tz=timezone.utc).date()
        precios.append({
            'fecha': fecha,
            'precio_cierre': cierre,
            'precio_apertura': aperturas[i] if i < len(aperturas) else None,
            'precio_max': maximos[i] if i < len(maximos) else None,
            'precio_min': minimos[i] if i < len(minimos) else None,
            'volumen': volumenes[i] if i < len(volumenes) else None,
        })

    dividendos = []
    eventos_dividendos = resultado.get('events', {}).get('dividends', {})
    for evento in eventos_dividendos.values():
        fecha_pago = datetime.fromtimestamp(evento['date'], tz=timezone.utc).date()
        dividendos.append({
            'fecha_pago': fecha_pago,
            'monto_por_certificado': evento['amount'],
        })

    return {'precios': precios, 'dividendos': dividendos}


def obtener_historial_con_reintentos(ticker: str, fecha_inicio: date, fecha_fin: date, intentos: int = 2, espera_segundos: float = 1.0) -> dict:
    ultimo_error = None
    for intento in range(intentos):
        try:
            return obtener_historial(ticker, fecha_inicio, fecha_fin)
        except (requests.RequestException, YahooFinanceError) as exc:
            ultimo_error = exc
            logger.warning('Intento %s/%s fallido para %s: %s', intento + 1, intentos, ticker, exc)
            time.sleep(espera_segundos)
    raise YahooFinanceError(f"No se pudo obtener historial de {ticker} tras {intentos} intentos: {ultimo_error}")
