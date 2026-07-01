import base64
import html
import mimetypes
from io import BytesIO
from weasyprint import HTML
from django.core.mail import EmailMessage
from django.conf import settings


def _logo_data_uri(org):
    """Devuelve el logo de la organización como data URI base64, o None si no hay logo."""
    if not org.logo:
        return None
    try:
        content_type = mimetypes.guess_type(org.logo.name)[0] or 'image/png'
        with org.logo.open('rb') as f:
            encoded = base64.b64encode(f.read()).decode('ascii')
        return f"data:{content_type};base64,{encoded}"
    except (FileNotFoundError, ValueError):
        return None


def _iniciales(nombre):
    palabras = [p for p in nombre.split() if p]
    return ''.join(p[0] for p in palabras[:2]).upper() or '—'


def generar_pdf_cotizacion(cotizacion):
    """
    Genera un PDF de una cotización con branding de la organización.

    Args:
        cotizacion: Instancia de Cotizacion (debe tener items, cliente, organization)

    Returns:
        BytesIO: Buffer con PDF binary
    """
    org = cotizacion.organization
    cliente = cotizacion.cliente
    items = cotizacion.items.all()
    accent = org.color_primario
    esc = html.escape

    logo_uri = _logo_data_uri(org)
    logo_html = (
        f'<img src="{logo_uri}" alt="{esc(org.nombre)}">'
        if logo_uri
        else f'<span>{esc(_iniciales(org.nombre))}</span>'
    )

    # Construir HTML con datos de cotización
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            :root {{
                --fg: oklch(18% 0.012 250);
                --muted: oklch(48% 0.012 250);
                --border: oklch(90% 0.005 250);
                --accent: {accent};
                --accent-soft: {accent}1f;
            }}

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 13px;
                line-height: 1.5;
                color: var(--fg);
                background: #fff;
                padding: 40px 48px;
            }}

            /* Header */
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 24px;
                margin-bottom: 32px;
                padding-bottom: 24px;
                border-bottom: 1px solid var(--border);
            }}

            .header-brand {{
                display: flex;
                align-items: center;
                gap: 16px;
            }}

            .logo-box {{
                width: 64px;
                height: 64px;
                border-radius: 6px;
                display: grid;
                place-items: center;
                flex-shrink: 0;
                overflow: hidden;
                background: var(--accent-soft);
                color: var(--accent);
                font-size: 18px;
                font-weight: 700;
                letter-spacing: 0.02em;
            }}

            .logo-box img {{
                width: 100%;
                height: 100%;
                object-fit: contain;
            }}

            .org-name {{
                font-size: 19px;
                font-weight: 700;
                letter-spacing: -0.01em;
                color: var(--fg);
                margin-bottom: 4px;
            }}

            .org-details {{
                font-size: 12px;
                color: var(--muted);
                line-height: 1.6;
            }}

            .header-meta {{
                text-align: right;
                flex-shrink: 0;
            }}

            .header-meta h1 {{
                font-size: 20px;
                font-weight: 700;
                letter-spacing: 0.02em;
                color: var(--accent);
                margin-bottom: 8px;
            }}

            .meta-line {{
                font-size: 12px;
                color: var(--muted);
                line-height: 1.6;
            }}

            .meta-line strong {{
                color: var(--fg);
                font-weight: 600;
            }}

            .status-badge {{
                display: inline-block;
                margin-top: 8px;
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }}

            .status-borrador {{ background: oklch(94% 0.003 250); color: var(--muted); }}
            .status-enviada {{ background: oklch(93% 0.05 250); color: oklch(45% 0.15 250); }}
            .status-aceptada {{ background: oklch(93% 0.06 150); color: oklch(45% 0.15 150); }}
            .status-rechazada {{ background: oklch(93% 0.06 25); color: oklch(50% 0.18 25); }}
            .status-expirada {{ background: oklch(93% 0.06 70); color: oklch(50% 0.15 70); }}

            /* Info grid */
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 32px;
                margin-bottom: 32px;
            }}

            .info-block h3 {{
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--muted);
                margin-bottom: 6px;
            }}

            .info-block p {{
                font-size: 13px;
                line-height: 1.6;
            }}

            /* Table */
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
            }}

            thead th {{
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--muted);
                text-align: left;
                padding: 8px 10px;
                border-bottom: 2px solid var(--border);
            }}

            thead th.text-right,
            tbody td.text-right {{
                text-align: right;
            }}

            tbody td {{
                padding: 10px;
                border-bottom: 1px solid var(--border);
                font-size: 13px;
                vertical-align: top;
            }}

            tbody td.col-index {{
                width: 32px;
                text-align: center;
                color: var(--muted);
            }}

            tbody td.col-amount {{
                width: 100px;
                font-variant-numeric: tabular-nums;
            }}

            .item-desc {{
                font-size: 13px;
            }}

            .item-notes {{
                font-size: 11px;
                color: var(--muted);
                margin-top: 2px;
            }}

            /* Totals */
            .totals {{
                margin-left: auto;
                width: 260px;
                margin-bottom: 32px;
            }}

            .totals-row {{
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                font-size: 13px;
                font-variant-numeric: tabular-nums;
            }}

            .totals-row .label {{
                color: var(--muted);
            }}

            .totals-row.grand-total {{
                padding-top: 10px;
                margin-top: 6px;
                border-top: 2px solid var(--fg);
                font-weight: 700;
                font-size: 15px;
            }}

            .totals-row.grand-total .amount {{
                color: var(--accent);
            }}

            /* Terms */
            .terms {{
                padding-top: 20px;
                border-top: 1px solid var(--border);
            }}

            .terms h3 {{
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--muted);
                margin-bottom: 8px;
            }}

            .terms p {{
                font-size: 11px;
                color: var(--muted);
                line-height: 1.6;
            }}

            /* Footer */
            .footer {{
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid var(--border);
                font-size: 10px;
                color: var(--muted);
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-brand">
                <div class="logo-box">{logo_html}</div>
                <div>
                    <div class="org-name">{esc(org.nombre)}</div>
                    <div class="org-details">
                        {esc(org.email)}<br>
                        {esc(org.telefono) if org.telefono else ''}
                    </div>
                </div>
            </div>
            <div class="header-meta">
                <h1>COTIZACIÓN</h1>
                <div class="meta-line"><strong>No.</strong> {esc(cotizacion.numero)}</div>
                <div class="meta-line"><strong>Fecha:</strong> {cotizacion.creado.strftime('%d/%m/%Y')}</div>
                <div class="meta-line"><strong>Válida hasta:</strong> {cotizacion.fecha_vencimiento.strftime('%d/%m/%Y')}</div>
                <span class="status-badge status-{cotizacion.estado}">{esc(cotizacion.get_estado_display())}</span>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-block">
                <h3>Cliente</h3>
                <p>
                    {esc(cliente.nombre)}<br>
                    {esc(cliente.direccion) if cliente.direccion else ''}
                </p>
            </div>
            <div class="info-block">
                <h3>Contacto</h3>
                <p>
                    {esc(cliente.email)}<br>
                    {esc(cliente.telefono) if cliente.telefono else ''}
                </p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th class="col-index">#</th>
                    <th>Descripción</th>
                    <th class="text-right">Cantidad</th>
                    <th class="text-right">Precio unit.</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
    """

    for index, item in enumerate(items, start=1):
        subtotal = item.calcular_subtotal()
        notas_html = f'<div class="item-notes">{esc(item.notas)}</div>' if item.notas else ''
        html_content += f"""
                <tr>
                    <td class="col-index">{index}</td>
                    <td>
                        <div class="item-desc">{esc(item.servicio.nombre)}</div>
                        {notas_html}
                    </td>
                    <td class="text-right col-amount">{item.cantidad}</td>
                    <td class="text-right col-amount">${item.precio_unitario:.2f}</td>
                    <td class="text-right col-amount">${subtotal:.2f}</td>
                </tr>
        """

    descripcion_html = (
        f'<div class="terms"><h3>Notas</h3><p>{esc(cotizacion.descripcion)}</p></div>'
        if cotizacion.descripcion
        else ''
    )

    html_content += f"""
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span class="label">Subtotal</span>
                <span class="amount">${float(cotizacion.subtotal):.2f}</span>
            </div>
            <div class="totals-row">
                <span class="label">IVA (16%)</span>
                <span class="amount">${float(cotizacion.impuesto):.2f}</span>
            </div>
            <div class="totals-row grand-total">
                <span class="label">Total</span>
                <span class="amount">${float(cotizacion.total):.2f}</span>
            </div>
        </div>

        <div class="terms">
            <h3>Términos y condiciones</h3>
            <p>Cotización válida hasta el {cotizacion.fecha_vencimiento.strftime('%d/%m/%Y')}.</p>
            <p>Los precios incluyen IVA (16%).</p>
        </div>
        {descripcion_html}

        <div class="footer">
            <span>
                {esc(org.nombre)}
                {' &middot; ' + esc(org.telefono) if org.telefono else ''}
                {' &middot; ' + esc(org.email)}
                {' &middot; ' + esc(org.sitio_web) if org.sitio_web else ''}
            </span>
        </div>
    </body>
    </html>
    """

    # Generar PDF usando WeasyPrint
    html_doc = HTML(string=html_content)
    pdf_buffer = BytesIO()
    html_doc.write_pdf(pdf_buffer)
    pdf_buffer.seek(0)

    return pdf_buffer


def enviar_pdf_por_email(cotizacion, email_destino):
    """
    Genera PDF de una cotización y lo envía por email.

    Args:
        cotizacion: Instancia de Cotizacion
        email_destino: Email destino (string)

    Returns:
        tuple: (éxito: bool, mensaje: str)
    """
    try:
        pdf_buffer = generar_pdf_cotizacion(cotizacion)

        org = cotizacion.organization
        asunto = f"Cotización {cotizacion.numero} de {org.nombre}"
        cuerpo = f"""Hola,

Adjunto encontrarás la cotización {cotizacion.numero}.

Detalles:
- Cliente: {cotizacion.cliente.nombre}
- Total: ${cotizacion.total:.2f}
- Estado: {cotizacion.get_estado_display()}

Si tienes preguntas, no dudes en contactarnos.

---
{org.nombre}
{org.email}
{org.telefono or ''}
"""

        email = EmailMessage(
            subject=asunto,
            body=cuerpo,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email_destino],
        )

        # Adjuntar PDF
        pdf_buffer.seek(0)
        email.attach(
            filename=f"{cotizacion.numero}.pdf",
            content=pdf_buffer.read(),
            mimetype='application/pdf'
        )

        # Enviar
        email.send()

        return True, f"Email enviado a {email_destino}"

    except Exception as e:
        return False, f"Error al enviar email: {str(e)}"
