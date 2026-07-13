"""OCR y extracción de datos de recibos/tickets (fotos).

El pipeline es: preprocesar imagen (Pillow) → OCR (pytesseract, español) →
parsing con heurísticas para tickets mexicanos. Las funciones de parsing son
puras (texto → dato) para poder testearlas sin imágenes.
"""
import re
from datetime import date
from io import BytesIO

from PIL import Image, ImageOps

MAX_LADO_PX = 2000

# Montos tipo 1,234.56 / 1.234,56 / 385.50 / $ 385.50
MONTO_RE = re.compile(r'\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?!\d)')

# Etiquetas de total, de más a menos específica
ETIQUETAS_TOTAL = ('TOTAL A PAGAR', 'IMPORTE TOTAL', 'GRAN TOTAL', 'TOTAL', 'IMPORTE')
# Líneas que parecen total pero no lo son
ETIQUETAS_EXCLUIR = ('SUBTOTAL', 'TOTAL DE ARTICULOS', 'TOTAL ARTICULOS', 'TOTAL DE PRODUCTOS')

FECHA_NUMERICA_RE = re.compile(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})')
MESES = {
    'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
}
FECHA_TEXTO_RE = re.compile(
    r'(\d{1,2})\s*(?:DE\s+)?(' + '|'.join(MESES) + r')[A-ZÁÉÍÓÚ]*\.?\s*(?:DE\s+)?(\d{2,4})',
    re.IGNORECASE,
)


def preprocesar(imagen):
    """Mejoras baratas que suben mucho el acierto del OCR en tickets."""
    img = ImageOps.exif_transpose(imagen)
    img = img.convert('L')
    img = ImageOps.autocontrast(img)
    if max(img.size) > MAX_LADO_PX:
        img.thumbnail((MAX_LADO_PX, MAX_LADO_PX))
    return img


def extraer_texto(file_bytes):
    import pytesseract

    img = Image.open(BytesIO(file_bytes))
    img = preprocesar(img)
    # --psm 6: tratar el ticket como un bloque uniforme, línea por línea.
    # Sin esto, tesseract separa etiquetas y montos en "columnas" y los desordena.
    return pytesseract.image_to_string(img, lang='spa', config='--psm 6')


def _normalizar_monto(crudo):
    """'1,234.56' | '1.234,56' | '385,50' → '1234.56' (string con 2 decimales), o None."""
    s = crudo.strip().lstrip('$').replace(' ', '')
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')  # 1.234,56 → 1234.56
        else:
            s = s.replace(',', '')  # 1,234.56 → 1234.56
    elif ',' in s:
        entero, _, decimal = s.rpartition(',')
        if len(decimal) == 2:
            s = entero.replace(',', '') + '.' + decimal  # 385,50 → 385.50
        else:
            s = s.replace(',', '')
    try:
        valor = float(s)
    except ValueError:
        return None
    if valor <= 0 or valor > 10_000_000:
        return None
    return f'{valor:.2f}'


def detectar_monto(texto):
    """Busca el total del ticket: primero junto a etiquetas TOTAL/IMPORTE,
    si no, el monto más grande del texto. None si no hay candidatos."""
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]

    for etiqueta in ETIQUETAS_TOTAL:
        for i, linea in enumerate(lineas):
            mayus = linea.upper()
            if etiqueta not in mayus:
                continue
            if any(excl in mayus for excl in ETIQUETAS_EXCLUIR):
                continue
            # El monto puede estar en la misma línea o en la siguiente
            for candidata in (linea, lineas[i + 1] if i + 1 < len(lineas) else ''):
                match = MONTO_RE.search(candidata)
                if match:
                    monto = _normalizar_monto(match.group(1))
                    if monto:
                        return monto

    # Fallback: el monto más grande de todo el texto
    montos = []
    for match in MONTO_RE.finditer(texto):
        monto = _normalizar_monto(match.group(1))
        if monto:
            montos.append(float(monto))
    if montos:
        return f'{max(montos):.2f}'
    return None


def _fecha_valida(dia, mes, anio):
    if anio < 100:
        anio += 2000
    try:
        return date(anio, mes, dia)
    except ValueError:
        return None


def _todas_las_fechas(texto):
    """Todas las fechas parseables con el índice de línea donde aparecen."""
    lineas = texto.splitlines()
    fechas = []
    for idx, linea in enumerate(lineas):
        for match in FECHA_NUMERICA_RE.finditer(linea):
            dia, mes, anio = (int(g) for g in match.groups())
            f = _fecha_valida(dia, mes, anio)
            if f:
                fechas.append((f, idx))
        for match in FECHA_TEXTO_RE.finditer(linea.upper()):
            dia, mes_txt, anio = match.groups()
            f = _fecha_valida(int(dia), MESES[mes_txt[:3]], int(anio))
            if f:
                fechas.append((f, idx))
    return fechas, lineas


def detectar_fecha(texto):
    """Fecha de un ticket (movimiento): la pasada más reciente.
    Un ticket no viene del futuro ni de hace décadas — esas se descartan."""
    hoy = date.today()
    candidatas = [
        f for f, _ in _todas_las_fechas(texto)[0]
        if f <= hoy and (hoy - f).days <= 365 * 3
    ]
    if not candidatas:
        return None
    return max(candidatas).isoformat()


# Etiquetas de vencimiento en facturas a crédito
ETIQUETAS_VENCIMIENTO = (
    'VENCE', 'VENCIMIENTO', 'FECHA LIMITE', 'FECHA LÍMITE',
    'PAGO ANTES DE', 'PAGAR ANTES DE', 'FECHA DE PAGO',
)
CREDITO_DIAS_RE = re.compile(r'CR[EÉ]DITO\s*(?:A\s*)?(\d{1,3})\s*D[IÍ]AS')


def detectar_fechas_deuda(texto):
    """Para facturas a crédito: separa emisión (pasada) de vencimiento (normalmente
    futura — lo contrario de un ticket). Prioridad del vencimiento:
    1) fecha junto a una etiqueta VENCE/FECHA LÍMITE/… (misma línea o la anterior),
    2) la fecha futura más próxima,
    3) 'CRÉDITO N DÍAS' → emisión + N."""
    from datetime import timedelta

    hoy = date.today()
    fechas, lineas = _todas_las_fechas(texto)

    etiquetadas, no_etiquetadas = [], []
    for f, idx in fechas:
        if (hoy - f).days > 365 * 3 or (f - hoy).days > 365 * 2:
            continue
        linea_u = lineas[idx].upper()
        previa_u = lineas[idx - 1].upper() if idx > 0 else ''
        if any(e in linea_u or e in previa_u for e in ETIQUETAS_VENCIMIENTO):
            etiquetadas.append(f)
        else:
            no_etiquetadas.append(f)

    pasadas = [f for f in no_etiquetadas if f <= hoy]
    emision = max(pasadas) if pasadas else None

    if etiquetadas:
        vencimiento = max(etiquetadas)
    else:
        futuras = [f for f in no_etiquetadas if f > hoy]
        if futuras:
            vencimiento = min(futuras)  # el vencimiento más próximo
        else:
            vencimiento = None
            match = CREDITO_DIAS_RE.search(texto.upper())
            if match and emision:
                vencimiento = emision + timedelta(days=int(match.group(1)))

    return {
        'emision': emision.isoformat() if emision else None,
        'vencimiento': vencimiento.isoformat() if vencimiento else None,
    }


def detectar_comercio(texto):
    """Los tickets ponen el nombre del comercio en las primeras líneas."""
    for linea in texto.splitlines():
        limpia = linea.strip()
        if len(limpia) < 3:
            continue
        letras = sum(1 for c in limpia if c.isalpha())
        if letras < len(limpia) * 0.5:
            continue  # línea de números/símbolos, no es el nombre
        return limpia[:60]
    return None


def analizar_recibo(file_bytes, nombre_archivo, contexto='movimiento'):
    """Pipeline completo para una imagen. Nunca inventa valores: lo que no se
    detecta viaja como None y el usuario lo completa a mano.

    contexto='movimiento' (ticket → gasto/ingreso) o 'deuda' (factura a crédito:
    además separa fecha de emisión y de vencimiento)."""
    texto = extraer_texto(file_bytes)
    monto = detectar_monto(texto)
    comercio = detectar_comercio(texto)

    if contexto == 'deuda':
        fechas = detectar_fechas_deuda(texto)
        fecha = fechas['emision']
        vencimiento = fechas['vencimiento']
    else:
        fecha = detectar_fecha(texto)
        vencimiento = None

    if monto and fecha:
        confianza = 'alta'
    elif monto:
        confianza = 'media'
    else:
        confianza = 'baja'

    resultado = {
        'archivo': nombre_archivo,
        'monto': monto,
        'fecha': fecha,
        'comercio': comercio,
        'texto_crudo': texto,
        'confianza': confianza,
    }
    if contexto == 'deuda':
        resultado['fecha_vencimiento'] = vencimiento
    return resultado
