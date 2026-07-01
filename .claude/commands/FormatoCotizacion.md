# Mejora de Coticaicon

## Basate en el siguiente codigo para mejorar el formato de cotizacion 

- Codigo de ejemplo:
!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cotización — Plantilla</title>
  <style>
    :root {
      --bg:          oklch(100% 0 0);
      --surface:     oklch(100% 0 0);
      --fg:          oklch(18% 0.012 250);
      --muted:       oklch(48% 0.012 250);
      --border:      oklch(90% 0.005 250);
      --accent:      oklch(45% 0.14 255);
      --accent-light: oklch(93% 0.04 255);

      --font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font);
      font-size: 14px;
      line-height: 1.5;
      color: var(--fg);
      background: oklch(96% 0.003 250);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      padding: 40px 20px;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      background: var(--bg);
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
      padding: 48px 56px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 32px;
      margin-bottom: 40px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--border);
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-placeholder {
      width: 72px;
      height: 72px;
      background: oklch(92% 0.005 250);
      border: 2px dashed var(--border);
      border-radius: 6px;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      flex-shrink: 0;
    }

    .company-name {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--fg);
    }

    .company-name .placeholder {
      color: var(--muted);
      font-weight: 400;
      font-size: 13px;
      letter-spacing: 0.02em;
      display: block;
      margin-top: 2px;
    }

    .header-meta {
      text-align: right;
      flex-shrink: 0;
    }

    .header-meta h1 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--accent);
      margin-bottom: 8px;
    }

    .meta-line {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.6;
    }

    .meta-line strong {
      color: var(--fg);
      font-weight: 510;
    }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 36px;
    }

    .info-block h3 {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .info-block p {
      font-size: 14px;
      line-height: 1.6;
    }

    .info-block .placeholder {
      color: var(--muted);
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }

    thead th {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid var(--border);
    }

    thead th:last-child,
    tbody td:last-child {
      text-align: right;
    }

    tbody td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
      vertical-align: top;
    }

    tbody td:first-child {
      width: 56px;
      text-align: center;
      color: var(--muted);
    }

    tbody td:nth-child(2) {
      width: auto;
    }

    tbody td:nth-child(3),
    tbody td:nth-child(4) {
      width: 110px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-family: var(--font-mono);
      font-size: 13px;
    }

    .item-desc {
      font-size: 14px;
    }

    .item-desc .placeholder {
      color: var(--muted);
    }

    .item-notes {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }

    .empty-row td {
      padding: 24px 12px;
      text-align: center;
      color: var(--muted);
      font-size: 13px;
    }

    /* Totals */
    .totals {
      margin-left: auto;
      width: 280px;
      margin-bottom: 36px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }

    .totals-row .label {
      color: var(--muted);
    }

    .totals-row.total {
      padding-top: 10px;
      margin-top: 6px;
      border-top: 2px solid var(--fg);
      font-weight: 600;
      font-size: 16px;
    }

    .totals-row.total .amount {
      color: var(--accent);
    }

    /* Terms */
    .terms {
      padding-top: 28px;
      border-top: 1px solid var(--border);
    }

    .terms h3 {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .terms p {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 4px;
    }

    .terms .placeholder {
      color: var(--muted);
      font-style: italic;
    }

    /* Footer */
    .footer {
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--muted);
    }

    .footer .placeholder {
      color: var(--muted);
    }

    /* Print */
    @media print {
      body {
        background: #fff;
        padding: 0;
      }

      .page {
        max-width: none;
        box-shadow: none;
        border-radius: 0;
        padding: 40px 48px;
      }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      <div class="header-brand">
        <div class="logo-placeholder">LOGO<br>(nxn)</div>
        <div>
          <div class="company-name">
            <span class="placeholder">Nombre de la empresa (nxn)</span>
          </div>
        </div>
      </div>
      <div class="header-meta">
        <h1>COTIZACIÓN</h1>
        <div class="meta-line"><strong>No.</strong> <span class="placeholder">COT-0001</span></div>
        <div class="meta-line"><strong>Fecha:</strong> <span class="placeholder">DD/MM/AAAA</span></div>
        <div class="meta-line"><strong>Válida hasta:</strong> <span class="placeholder">DD/MM/AAAA</span></div>
      </div>
    </div>

    <!-- Info -->
    <div class="info-grid">
      <div class="info-block">
        <h3>Cliente</h3>
        <p>
          <span class="placeholder">Nombre del cliente<br>
          Dirección<br>
          Ciudad, País</span>
        </p>
      </div>
      <div class="info-block">
        <h3>Atención a</h3>
        <p>
          <span class="placeholder">Nombre de contacto<br>
          correo@ejemplo.com<br>
          +52 55 1234 5678</span>
        </p>
      </div>
    </div>

    <!-- Table -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Descripción</th>
          <th>Precio unit.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <!-- Row template — duplicate for each item -->
        <tr>
          <td>1</td>
          <td>
            <div class="item-desc"><span class="placeholder">Descripción del producto o servicio</span></div>
            <div class="item-notes"><span class="placeholder">Especificaciones adicionales</span></div>
          </td>
          <td><span class="placeholder">$0.00</span></td>
          <td><span class="placeholder">$0.00</span></td>
        </tr>
        <tr>
          <td>2</td>
          <td>
            <div class="item-desc"><span class="placeholder">Descripción del producto o servicio</span></div>
          </td>
          <td><span class="placeholder">$0.00</span></td>
          <td><span class="placeholder">$0.00</span></td>
        </tr>
        <tr>
          <td>3</td>
          <td>
            <div class="item-desc"><span class="placeholder">Descripción del producto o servicio</span></div>
            <div class="item-notes"><span class="placeholder">Especificaciones adicionales</span></div>
          </td>
          <td><span class="placeholder">$0.00</span></td>
          <td><span class="placeholder">$0.00</span></td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="amount"><span class="placeholder">$0.00</span></span>
      </div>
      <div class="totals-row">
        <span class="label">IVA (16%)</span>
        <span class="amount"><span class="placeholder">$0.00</span></span>
      </div>
      <div class="totals-row total">
        <span class="label">Total</span>
        <span class="amount"><span class="placeholder">$0.00</span></span>
      </div>
    </div>

    <!-- Terms -->
    <div class="terms">
      <h3>Términos y condiciones</h3>
      <p><span class="placeholder">Forma de pago: Transferencia bancaria / Depósito</span></p>
      <p><span class="placeholder">Tiempo de entrega: — días hábiles</span></p>
      <p><span class="placeholder">Vigencia de la cotización: 15 días</span></p>
      <p><span class="placeholder">Garantía: — meses</span></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>
        <span class="placeholder">Tel: +52 55 0000 0000</span> &middot;
        <span class="placeholder">correo@empresa.com</span> &middot;
        <span class="placeholder">empresa.com</span>
      </span>
      <span>Pág. 1 de 1</span>
    </div>

  </div>

</body>
</html>