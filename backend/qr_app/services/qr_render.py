import io

import qrcode
import qrcode.image.svg as qr_svg
from PIL import Image
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import (
    HorizontalGradiantColorMask,
    RadialGradiantColorMask,
    SolidFillColorMask,
    SquareGradiantColorMask,
    VerticalGradiantColorMask,
)
from qrcode.image.styles.moduledrawers.pil import (
    CircleModuleDrawer,
    GappedSquareModuleDrawer,
    HorizontalBarsDrawer,
    RoundedModuleDrawer,
    SquareModuleDrawer,
    VerticalBarsDrawer,
)
from weasyprint import HTML

MODULE_DRAWERS = {
    'square': SquareModuleDrawer,
    'rounded': RoundedModuleDrawer,
    'circle': CircleModuleDrawer,
    'gapped_square': GappedSquareModuleDrawer,
    'horizontal_bars': HorizontalBarsDrawer,
    'vertical_bars': VerticalBarsDrawer,
}

GRADIENT_MASKS = {
    'radial': RadialGradiantColorMask,
    'square': SquareGradiantColorMask,
    'horizontal': HorizontalGradiantColorMask,
    'vertical': VerticalGradiantColorMask,
}


def _hex_to_rgb(hex_color):
    hex_color = (hex_color or '').lstrip('#') or '000000'
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def _build_color_mask(color_fg, color_bg, gradiente_tipo, color_gradiente):
    fg_rgb = _hex_to_rgb(color_fg)
    bg_rgb = _hex_to_rgb(color_bg)

    if gradiente_tipo and gradiente_tipo != 'none' and color_gradiente:
        end_rgb = _hex_to_rgb(color_gradiente)
        mask_cls = GRADIENT_MASKS.get(gradiente_tipo)
        if mask_cls in (RadialGradiantColorMask, SquareGradiantColorMask):
            return mask_cls(back_color=bg_rgb, center_color=fg_rgb, edge_color=end_rgb)
        if mask_cls is HorizontalGradiantColorMask:
            return mask_cls(back_color=bg_rgb, left_color=fg_rgb, right_color=end_rgb)
        if mask_cls is VerticalGradiantColorMask:
            return mask_cls(back_color=bg_rgb, top_color=fg_rgb, bottom_color=end_rgb)

    return SolidFillColorMask(back_color=bg_rgb, front_color=fg_rgb)


def _make_qr_image(
    url_data, *, color_fg='#000000', color_bg='#FFFFFF', forma='square', forma_ojos='square',
    gradiente_tipo='none', color_gradiente=None, margen=4, logo_file=None,
):
    """Genera la imagen PIL estilizada del QR (módulos, ojos, degradado, logo)."""
    error_correction = qrcode.constants.ERROR_CORRECT_H if logo_file else qrcode.constants.ERROR_CORRECT_M
    qr = qrcode.QRCode(error_correction=error_correction, border=margen, box_size=10)
    qr.add_data(url_data)
    qr.make(fit=True)

    module_drawer_cls = MODULE_DRAWERS.get(forma, SquareModuleDrawer)
    eye_drawer_cls = MODULE_DRAWERS.get(forma_ojos, SquareModuleDrawer)

    kwargs = dict(
        image_factory=StyledPilImage,
        module_drawer=module_drawer_cls(),
        eye_drawer=eye_drawer_cls(),
        color_mask=_build_color_mask(color_fg, color_bg, gradiente_tipo, color_gradiente),
    )

    if logo_file is not None:
        logo_file.seek(0)
        kwargs['embedded_image'] = Image.open(logo_file).convert('RGBA')

    return qr.make_image(**kwargs)


def render_qr_png(url_data, **kwargs):
    img = _make_qr_image(url_data, **kwargs)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


def render_qr_svg(url_data, *, color_fg='#000000', color_bg='#FFFFFF', forma='square', margen=4):
    """SVG vectorial simple: color sólido y forma básica de módulo, sin ojos/degradado/logo
    (esas variantes dependen de rasterizado PIL y no tienen equivalente vectorial directo)."""
    qr = qrcode.QRCode(border=margen, box_size=10)
    qr.add_data(url_data)
    qr.make(fit=True)

    drawer_alias = 'circle' if forma == 'circle' else 'gapped-square' if forma == 'gapped_square' else None
    img = qr.make_image(image_factory=qr_svg.SvgPathImage, module_drawer=drawer_alias)

    buffer = io.BytesIO()
    img.save(buffer)
    svg_bytes = buffer.getvalue()

    fg = (color_fg or '#000000')
    svg_str = svg_bytes.decode('utf-8').replace('#000000', fg)
    if color_bg and color_bg.lower() not in ('#ffffff', 'transparent'):
        svg_str = svg_str.replace(
            '<path', f'<rect width="100%" height="100%" fill="{color_bg}"/><path', 1,
        )
    return svg_str.encode('utf-8')


def render_qr_pdf(url_data, **kwargs):
    """Envuelve el PNG estilizado (con toda la personalización) en un PDF de una página."""
    import base64

    png_bytes = render_qr_png(url_data, **kwargs)
    png_b64 = base64.b64encode(png_bytes).decode('ascii')
    html = f"""
    <html>
    <head><style>
        body {{ margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }}
        img {{ max-width: 70%; max-height: 70%; }}
    </style></head>
    <body><img src="data:image/png;base64,{png_b64}"></body>
    </html>
    """
    buffer = io.BytesIO()
    HTML(string=html).write_pdf(buffer)
    buffer.seek(0)
    return buffer.getvalue()
