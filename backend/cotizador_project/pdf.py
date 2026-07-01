from io import BytesIO
from decimal import Decimal
from weasyprint import HTML, CSS
from django.urls import reverse
from django.core.mail import EmailMessage
from django.conf import settings


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

    # Construir HTML con datos de cotización
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: Arial, sans-serif;
                color: #333;
                background: white;
                padding: 40px;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                border-bottom: 3px solid {org.color_primario};
                padding-bottom: 20px;
            }}
            .org-info {{
                flex: 1;
            }}
            .org-name {{
                font-size: 24px;
                font-weight: bold;
                color: {org.color_primario};
                margin-bottom: 5px;
            }}
            .org-details {{
                font-size: 11px;
                color: #666;
                line-height: 1.6;
            }}
            .cot-number {{
                text-align: right;
            }}
            .cot-number-label {{
                font-size: 12px;
                color: #999;
                text-transform: uppercase;
            }}
            .cot-number-value {{
                font-size: 28px;
                font-weight: bold;
                color: {org.color_primario};
            }}
            .cot-status {{
                font-size: 14px;
                padding: 5px 10px;
                border-radius: 4px;
                display: inline-block;
                margin-top: 10px;
            }}
            .status-borrador {{ background: #f0f0f0; color: #666; }}
            .status-enviada {{ background: #e3f2fd; color: #1976d2; }}
            .status-aceptada {{ background: #e8f5e9; color: #388e3c; }}
            .status-rechazada {{ background: #ffebee; color: #d32f2f; }}
            .status-expirada {{ background: #fff3e0; color: #f57c00; }}

            .section-title {{
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                color: {org.color_primario};
                margin-top: 30px;
                margin-bottom: 10px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }}
            .two-columns {{
                display: flex;
                gap: 40px;
                margin-bottom: 30px;
            }}
            .column {{
                flex: 1;
            }}
            .label {{
                font-size: 11px;
                color: #999;
                text-transform: uppercase;
                margin-bottom: 3px;
            }}
            .value {{
                font-size: 14px;
                color: #333;
                margin-bottom: 15px;
            }}

            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            thead {{
                background-color: {org.color_primario};
                color: white;
            }}
            th {{
                padding: 12px;
                text-align: left;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }}
            td {{
                padding: 10px 12px;
                border-bottom: 1px solid #eee;
                font-size: 12px;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            .text-right {{
                text-align: right;
            }}
            .text-center {{
                text-align: center;
            }}

            .totals {{
                margin-top: 30px;
                display: flex;
                justify-content: flex-end;
            }}
            .totals-box {{
                width: 300px;
            }}
            .total-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 13px;
            }}
            .total-row.subtotal {{
                border-bottom: 1px solid #ddd;
            }}
            .total-row.tax {{
                color: #666;
            }}
            .total-row.grand-total {{
                margin-top: 10px;
                font-size: 16px;
                font-weight: bold;
                color: {org.color_primario};
                border-top: 2px solid {org.color_primario};
                padding-top: 12px;
            }}
            .total-label {{
                font-weight: bold;
            }}
            .total-value {{
                text-align: right;
            }}

            .footer {{
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 10px;
                color: #999;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="org-info">
                <div class="org-name">{org.nombre}</div>
                <div class="org-details">
                    {org.email}<br>
                    {org.telefono or ''}<br>
                    {org.direccion or ''}<br>
                    {org.ciudad or ''}, {org.pais or 'México'}
                </div>
            </div>
            <div class="cot-number">
                <div class="cot-number-label">Cotización</div>
                <div class="cot-number-value">{cotizacion.numero}</div>
                <div class="cot-status status-{cotizacion.estado}">{cotizacion.get_estado_display()}</div>
            </div>
        </div>

        <div class="two-columns">
            <div class="column">
                <div class="section-title">Cliente</div>
                <div class="value">{cliente.nombre}</div>
                <div class="label">Email</div>
                <div class="value">{cliente.email}</div>
                {f'<div class="label">Teléfono</div><div class="value">{cliente.telefono}</div>' if cliente.telefono else ''}
                {f'<div class="label">Dirección</div><div class="value">{cliente.direccion}</div>' if cliente.direccion else ''}
            </div>
            <div class="column">
                <div class="section-title">Detalles</div>
                <div class="label">Fecha de emisión</div>
                <div class="value">{cotizacion.creado.strftime('%d/%m/%Y')}</div>
                <div class="label">Fecha de vencimiento</div>
                <div class="value">{cotizacion.fecha_vencimiento.strftime('%d/%m/%Y')}</div>
                {f'<div class="label">Descripción</div><div class="value">{cotizacion.descripcion}</div>' if cotizacion.descripcion else ''}
            </div>
        </div>

        <div class="section-title">Servicios</div>
        <table>
            <thead>
                <tr>
                    <th>Servicio</th>
                    <th class="text-right">Cantidad</th>
                    <th class="text-right">Precio unitario</th>
                    <th class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
    """

    for item in items:
        subtotal = item.calcular_subtotal()
        html_content += f"""
                <tr>
                    <td>{item.servicio.nombre}</td>
                    <td class="text-right">{item.cantidad}</td>
                    <td class="text-right">${item.precio_unitario:.2f}</td>
                    <td class="text-right">${subtotal:.2f}</td>
                </tr>
        """

    html_content += """
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-box">
                <div class="total-row subtotal">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-value">${:.2f}</span>
                </div>
                <div class="total-row tax">
                    <span class="total-label">Impuesto (16%):</span>
                    <span class="total-value">${:.2f}</span>
                </div>
                <div class="total-row grand-total">
                    <span class="total-label">TOTAL:</span>
                    <span class="total-value">${:.2f}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Este documento fue generado automáticamente por AZ-Tools Cotizador</p>
        </div>
    </body>
    </html>
    """.format(
        float(cotizacion.subtotal),
        float(cotizacion.impuesto),
        float(cotizacion.total),
    )

    # Generar PDF usando WeasyPrint
    html = HTML(string=html_content)
    pdf_buffer = BytesIO()
    html.write_pdf(pdf_buffer)
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
