"""Motor de simulación de inversiones en FIBRAs.

Funciones puras: reciben series de precios/dividendos ya cargadas desde la
base de datos (ver services/queries.py) y devuelven estructuras planas listas
para serializar. No hacen consultas ORM ni llamadas HTTP.
"""
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, ROUND_HALF_UP


class SimulacionError(Exception):
    """Error de datos/parámetros que debe traducirse a HTTP 422, no 500."""


@dataclass
class PuntoPrecio:
    fecha: date
    precio: Decimal


@dataclass
class Dividendo:
    fecha: date
    monto_por_certificado: Decimal


def _redondear(valor: Decimal, decimales: str = '0.01') -> Decimal:
    return valor.quantize(Decimal(decimales), rounding=ROUND_HALF_UP)


def _precio_en_o_antes(precios: list[PuntoPrecio], fecha: date) -> Decimal | None:
    candidato = None
    for p in precios:
        if p.fecha <= fecha:
            candidato = p.precio
        else:
            break
    return candidato


def calcular_crecimiento(
    *,
    precios: list[PuntoPrecio],
    dividendos: list[Dividendo],
    monto_inicial: Decimal,
    fecha_inicio: date,
    fecha_fin: date,
    reinvertir_dividendos: bool,
    aportacion_periodica: Decimal | None = None,
    frecuencia_aportacion: str | None = None,
) -> dict:
    """Simula el crecimiento de una inversión en una FIBRA entre dos fechas.

    - Sin reinversión: los certificados iniciales se mantienen fijos, los
      dividendos se acumulan como efectivo aparte.
    - Con reinversión (DRIP): cada dividendo pagado compra certificados
      fraccionarios adicionales al precio de cierre más cercano.
    - Aportación periódica (DCA): en cada fecha de aportación (mensual o
      anual) se compran certificados adicionales al precio de ese momento,
      independientemente de la reinversión de dividendos.
    """
    if not precios:
        raise SimulacionError('No hay precios históricos disponibles para el rango solicitado.')

    precios = sorted(precios, key=lambda p: p.fecha)
    dividendos = sorted(dividendos, key=lambda d: d.fecha)

    fecha_inicio_real = max(fecha_inicio, precios[0].fecha)
    fecha_fin_real = min(fecha_fin, precios[-1].fecha)
    if fecha_inicio_real > fecha_fin_real:
        raise SimulacionError('No hay precios en el rango de fechas solicitado.')

    precio_inicial = _precio_en_o_antes(precios, fecha_inicio_real)
    if precio_inicial is None or precio_inicial <= 0:
        raise SimulacionError('No se encontró un precio inicial válido para la fecha de inicio.')

    certificados = monto_inicial / precio_inicial
    total_aportado = monto_inicial
    dividendos_totales = Decimal('0')
    serie_valor = []

    eventos = []
    for d in dividendos:
        if fecha_inicio_real < d.fecha <= fecha_fin_real:
            eventos.append(('dividendo', d.fecha, d))
    if aportacion_periodica and frecuencia_aportacion:
        for fecha_aportacion in _fechas_aportacion(fecha_inicio_real, fecha_fin_real, frecuencia_aportacion):
            eventos.append(('aportacion', fecha_aportacion, None))
    eventos.sort(key=lambda e: e[1])

    for tipo, fecha, payload in eventos:
        precio_evento = _precio_en_o_antes(precios, fecha)
        if precio_evento is None or precio_evento <= 0:
            continue
        if tipo == 'dividendo':
            monto_dividendo = payload.monto_por_certificado * certificados
            dividendos_totales += monto_dividendo
            if reinvertir_dividendos:
                certificados += monto_dividendo / precio_evento
        elif tipo == 'aportacion':
            certificados += aportacion_periodica / precio_evento
            total_aportado += aportacion_periodica

    for p in precios:
        if fecha_inicio_real <= p.fecha <= fecha_fin_real:
            serie_valor.append({'fecha': p.fecha.isoformat(), 'valor': _redondear(certificados * p.precio)})

    valor_final = certificados * precios[-1].precio if serie_valor else monto_inicial
    retorno_total_pct = ((valor_final - total_aportado) / total_aportado * 100) if total_aportado > 0 else Decimal('0')
    dias = (fecha_fin_real - fecha_inicio_real).days or 1
    anios = Decimal(dias) / Decimal('365')
    retorno_anualizado_pct = Decimal('0')
    if anios > 0 and total_aportado > 0 and valor_final > 0:
        # Aproximación CAGR simple (no XIRR): no ajusta por el momento de cada aportación.
        try:
            razon = float(valor_final / total_aportado)
            retorno_anualizado_pct = Decimal(str(round((razon ** (1 / float(anios)) - 1) * 100, 4)))
        except (OverflowError, ValueError):
            retorno_anualizado_pct = Decimal('0')

    return {
        'fecha_inicio_efectiva': fecha_inicio_real.isoformat(),
        'fecha_fin_efectiva': fecha_fin_real.isoformat(),
        'certificados_finales': _redondear(certificados, '0.000001'),
        'valor_final': _redondear(valor_final),
        'total_aportado': _redondear(total_aportado),
        'dividendos_totales': _redondear(dividendos_totales),
        'retorno_total_pct': _redondear(retorno_total_pct),
        'retorno_anualizado_pct': _redondear(retorno_anualizado_pct),
        'serie_valor': serie_valor,
    }


def _fechas_aportacion(inicio: date, fin: date, frecuencia: str) -> list[date]:
    fechas = []
    actual = inicio
    while actual <= fin:
        if frecuencia == 'mensual':
            mes = actual.month + 1
            anio = actual.year + (mes - 1) // 12
            mes = ((mes - 1) % 12) + 1
            dia = min(actual.day, 28)
            actual = date(anio, mes, dia)
        elif frecuencia == 'anual':
            actual = date(actual.year + 1, actual.month, min(actual.day, 28))
        else:
            raise SimulacionError(f"Frecuencia de aportación no soportada: {frecuencia}")
        if actual <= fin:
            fechas.append(actual)
    return fechas


def calcular_dividendos_proyectados(
    *,
    dividendos: list[Dividendo],
    certificados: Decimal,
    hoy: date,
    meses_historial: int = 12,
) -> dict:
    """Proyección de ingresos por dividendos basada en el promedio de los
    últimos `meses_historial` meses. Es retrospectivo, no una garantía futura.
    """
    limite = date(hoy.year - (meses_historial // 12), ((hoy.month - meses_historial - 1) % 12) + 1, 1)
    recientes = [d for d in dividendos if d.fecha >= limite]
    total_reciente = sum((d.monto_por_certificado for d in recientes), Decimal('0'))
    if not recientes:
        return {
            'mensual_estimado': Decimal('0'),
            'anual_estimado': Decimal('0'),
            'diario_estimado': Decimal('0'),
        }
    mensual = (total_reciente * certificados) / Decimal(meses_historial)
    anual = mensual * 12
    diario = anual / Decimal('365')
    return {
        'mensual_estimado': _redondear(mensual),
        'anual_estimado': _redondear(anual),
        'diario_estimado': _redondear(diario),
    }


def comparar_fibras(resultados_por_ticker: dict[str, dict]) -> list[dict]:
    """Combina las series de valor de varias FIBRAs en una serie por fecha
    para graficar con un eje compartido (forward-fill del último valor conocido).
    """
    fechas = sorted({punto['fecha'] for r in resultados_por_ticker.values() for punto in r['serie_valor']})
    ultimo_valor = {ticker: None for ticker in resultados_por_ticker}
    series_por_fecha = {ticker: {p['fecha']: p['valor'] for p in r['serie_valor']} for ticker, r in resultados_por_ticker.items()}

    serie_comparacion = []
    for fecha in fechas:
        punto = {'fecha': fecha}
        for ticker in resultados_por_ticker:
            valor = series_por_fecha[ticker].get(fecha, ultimo_valor[ticker])
            if valor is not None:
                ultimo_valor[ticker] = valor
            punto[ticker] = valor
        serie_comparacion.append(punto)
    return serie_comparacion
