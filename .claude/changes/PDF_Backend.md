# PDF Backend Implementation - Cotizaciones

**Date:** 2026-07-01  
**Phase:** Backend (Phase 1/2)  
**Component:** PDF Generation for Quotations

## Summary

Implemented server-side PDF generation for cotizaciones (quotations) using WeasyPrint. Users can now download professional PDFs with organization branding, quotation data, itemized table, and financial totals.

## Changes Made

### 1. Dependencies
**File:** `backend/requirements.txt`
- ✅ Added `weasyprint>=64.0` for HTML-to-PDF conversion

### 2. New PDF Utility
**File:** `backend/cotizador_project/pdf.py` (NEW)

**Function:** `generar_pdf_cotizacion(cotizacion)`
- Generates PDF from Django Cotizacion model instance
- Creates HTML template with:
  - **Header:** Organization name, logo placeholder, contact info (email, phone, address)
  - **Quotation Info:** Number (e.g., COT-20260701-0001), status badge, primary color branding
  - **Client Info:** Name, email, phone, address
  - **Details:** Issue date, expiration date, optional description
  - **Items Table:** Service name, quantity, unit price, subtotal for each line item
  - **Totals:** Subtotal, tax (16%), grand total with prominent styling
  - **Footer:** Auto-generated watermark
- Uses organization's `color_primario` for branding consistency
- Responsive CSS styling with proper spacing and typography
- Returns BytesIO buffer with PDF binary data

**Key Features:**
- Multi-tenant safe (scoped to organization)
- Status-based styling (borrador, enviada, aceptada, rechazada, expirada)
- Currency formatting for all monetary values
- Automatic line item calculation (cantidad × precio_unitario)
- Professional layout suitable for client delivery

### 3. REST API Endpoint
**File:** `backend/cotizador_project/views.py`
**Class:** `CotizacionViewSet`

**New Action:**
```python
@action(detail=True, methods=['get'])
def pdf(self, request, pk=None):
    """Descargar cotización como PDF"""
```

**Endpoint:** `GET /api/cotizaciones/{id}/pdf/`

**Response:**
- **Content-Type:** `application/pdf`
- **Body:** PDF binary file
- **Filename:** `{cotizacion.numero}.pdf` (e.g., `COT-20260701-0001.pdf`)
- **Downloads:** As attachment (forces download instead of preview)

**Permissions:**
- Inherits from CotizacionViewSet:
  - `IsAuthenticated` — User must be logged in
  - `HasRolPermission` — Role-based access control
  - `PuedeCrearCotizaciones` / `PuedeEliminarCotizaciones` — User permission flags
  - `OrganizationFilterMixin` — Data scoped to user's organization

**Error Handling:**
- Returns 404 if quotation doesn't exist or user lacks access
- Returns 403 if user lacks permission to view quotation

## Testing

### Manual Test
1. Install dependencies: `pip install weasyprint`
2. Create a quotation with items via `/api/cotizaciones/` endpoint
3. Call: `GET /api/cotizaciones/{id}/pdf/` using curl or Postman
   ```bash
   curl -H "Authorization: Token YOUR_TOKEN" \
        http://localhost:8000/api/cotizaciones/1/pdf/ \
        -o cotizacion.pdf
   ```
4. Open downloaded PDF and verify:
   - ✅ Organization branding (name, color, contact info)
   - ✅ Quotation number and status
   - ✅ Client information
   - ✅ Items table with correct calculations
   - ✅ Totals (subtotal, tax 16%, total)
   - ✅ Professional layout and typography

### Automated Test (Future)
```python
def test_cotizacion_pdf_export(api_client, cotizacion_with_items):
    response = api_client.get(f'/api/cotizaciones/{cotizacion_with_items.id}/pdf/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'application/pdf'
    assert b'%PDF' in response.content  # PDF magic bytes
```

## Technical Notes

### WeasyPrint Choice
- ✅ Converts HTML + CSS → PDF (flexible layout)
- ✅ Supports organization branding (colors, fonts)
- ✅ Handles currency formatting and tables well
- ✅ Pure Python (no external binary dependencies like wkhtmltopdf)
- ⚠️ Note: Requires some system dependencies (libffi, libcairo) on first install

### Architecture
- **Server-side generation:** PDF generated on backend (better security, no client data exposure)
- **Stateless:** Each request generates fresh PDF (no storage needed)
- **Organization-aware:** Respects org branding (logo_url, color_primario)
- **Permission-aware:** Inherits all CotizacionViewSet permission rules

### Future Enhancements
- Add logo image from `organization.logo` field to PDF header
- Support custom footer text per organization
- Cache generated PDFs temporarily for performance
- Add email delivery via WhatsApp/Gmail (Phase 2)
- Add QR code with quotation link (requires python-qrcode)

## Files Modified
- ✅ `backend/requirements.txt` — Added weasyprint
- ✅ `backend/cotizador_project/views.py` — Added imports + endpoint
- ✅ `backend/cotizador_project/pdf.py` — NEW utility file

## Status
✅ **COMPLETE** — Ready for frontend integration  
Next: Frontend download button in Cotizaciones.jsx (Phase 2)
