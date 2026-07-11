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


def _construir_fecha(dia, mes, anio):
    if anio < 100:
        anio += 2000
    try:
        f = date(anio, mes, dia)
    except ValueError:
        return None
    # Un ticket no viene del futuro lejano ni de hace décadas
    hoy = date.today()
    if f > hoy or (hoy - f).days > 365 * 3:
        return None
    return f


def detectar_fecha(texto):
    """Fecha del ticket (formato mexicano dd/mm/yyyy o '10 JUL 2026').
    Si hay varias, la más reciente. None si no hay válidas."""
    candidatas = []

    for match in FECHA_NUMERICA_RE.finditer(texto):
        dia, mes, anio = (int(g) for g in match.groups())
        f = _construir_fecha(dia, mes, anio)
        if f:
            candidatas.append(f)

    for match in FECHA_TEXTO_RE.finditer(texto.upper()):
        dia, mes_txt, anio = match.groups()
        f = _construir_fecha(int(dia), MESES[mes_txt[:3]], int(anio))
        if f:
            candidatas.append(f)

    if not candidatas:
        return None
    return max(candidatas).isoformat()


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


def analizar_recibo(file_bytes, nombre_archivo):
    """Pipeline completo para una imagen. Nunca inventa valores: lo que no se
    detecta viaja como None y el usuario lo completa a mano."""
    texto = extraer_texto(file_bytes)
    monto = detectar_monto(texto)
    fecha = detectar_fecha(texto)
    comercio = detectar_comercio(texto)

    if monto and fecha:
        confianza = 'alta'
    elif monto:
        confianza = 'media'
    else:
        confianza = 'baja'

    return {
        'archivo': nombre_archivo,
        'monto': monto,
        'fecha': fecha,
        'comercio': comercio,
        'texto_crudo': texto,
        'confianza': confianza,
    }
