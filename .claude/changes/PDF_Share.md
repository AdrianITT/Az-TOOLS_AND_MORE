# PDF Share Implementation - Cotizaciones (Phase 3)

**Date:** 2026-07-01  
**Phase:** Share/Distribution (Phase 3/3)  
**Component:** WhatsApp and Email sharing for Quotations

## Summary

Implemented server-side email sending and client-side WhatsApp link generation for quotation PDFs. Users can now share quotations with clients via WhatsApp or send them by email with the PDF automatically attached.

## Changes Made

### 1. Backend: Email Sending Function

**File:** `backend/cotizador_project/pdf.py`

**New Function:** `enviar_pdf_por_email(cotizacion, email_destino)`
- Generates PDF using existing `generar_pdf_cotizacion()` function
- Creates EmailMessage with PDF attachment
- Auto-generates professional email body with quotation details:
  - Quotation number (e.g., COT-20260701-0001)
  - Client name
  - Total amount
  - Current state
  - Organization contact info
- Sends via Django's EmailMessage backend (respects EMAIL_BACKEND setting)
- Returns tuple: `(success: bool, message: str)` for error handling
- Filename format: `{cotizacion.numero}.pdf`

**Error Handling:**
- Catches exceptions and returns meaningful error messages
- Invalid email addresses handled by SMTP backend
- Email backend config handled by Django settings

### 2. Backend: API Endpoint

**File:** `backend/cotizador_project/views.py`

**New Endpoint:** `POST /api/cotizaciones/{id}/compartir_email/`
- Custom action in `CotizacionViewSet`
- Request body:
  ```json
  {
    "email_destino": "client@example.com"
  }
  ```
- Validates email field is provided
- Calls `enviar_pdf_por_email()` backend function
- Response on success:
  ```json
  {
    "success": true,
    "message": "Email enviado a client@example.com"
  }
  ```
- Response on error: 400 ValidationError with descriptive message
- Inherits all CotizacionViewSet permissions:
  - IsAuthenticated
  - HasRolPermission
  - Org-scoped data (user can only share their org's quotations)

**Imports Added:**
- `EmailMessage` from `django.core.mail`
- `enviar_pdf_por_email` from `.pdf` module

### 3. Frontend: Share Functions

**File:** `frontend/src/pages/Cotizaciones/Cotizaciones.jsx`

**Function 1: `abrirWhatsApp(cotizacionId, numero)`**
- Generates WhatsApp sharing link with quotation reference
- URL format: `https://wa.me/?text={encoded-message}`
- Message includes: quotation link and number
- Opens in new browser window
- No backend required (pure frontend URL generation)
- User must manually copy/paste link to their WhatsApp contact

**Function 2: `compartirPorEmail(cotizacionId, clienteEmail)`**
- Prompts user for email destination (pre-fills with client email if available)
- Validates email input (non-empty)
- POST request to `/api/cotizaciones/{id}/compartir_email/` with:
  - Authorization token from localStorage
  - Email destination in request body
- Shows success alert if email sent
- Shows error alert with backend message if fails
- Handles network errors gracefully

### 4. Frontend: Share Buttons in Table

**File:** `frontend/src/pages/Cotizaciones/Cotizaciones.jsx`

**Location:** Acciones column in quotations table

**Button Layout:**
- 4 buttons now in flexbox row with wrapping:
  1. "Ver items" (existing) — expand quotation details
  2. "Descargar PDF" (existing) — download quotation as PDF
  3. **"WhatsApp"** (new) — copy WhatsApp sharing link
  4. **"Email"** (new) — send quotation via email

**Styling:**
- All buttons use `variant="secondary"` for consistency
- Flexbox layout: `display: 'flex', gap: '8px', flexWrap: 'wrap'`
- Responsive: buttons wrap to next line on narrow screens

## Architecture Decisions

### Why Server-Side Email?
- ✅ Respects Django's email configuration (dev console, SMTP, SendGrid, etc.)
- ✅ PDF attachment handled securely server-side
- ✅ No exposure of email credentials to frontend
- ✅ Better error handling and logging

### Why Client-Side WhatsApp?
- ✅ No backend needed (reduces server load)
- ✅ Instant response (no API round-trip)
- ✅ User retains control of phone number (not stored)
- ✅ Works offline (link generation is local)
- ⚠️ Trade-off: User must manually enter/select WhatsApp contact

## Testing

### Backend Testing
1. Email config check:
   ```bash
   # In Django shell:
   from django.conf import settings
   print(settings.EMAIL_BACKEND)
   print(settings.DEFAULT_FROM_EMAIL)
   ```
   - Should show configured email backend (console for dev, SMTP for prod)

2. Endpoint test:
   ```bash
   curl -X POST \
     -H "Authorization: Token YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"email_destino": "test@example.com"}' \
     http://localhost:8000/api/cotizaciones/1/compartir_email/
   ```
   - Response: `{"success": true, "message": "Email enviado a test@example.com"}`

3. Email delivery (dev):
   - Console backend prints email to stdout (visible in server logs)
   - In production, SMTP backend actually sends email

### Frontend Testing
1. **WhatsApp button:**
   - Click "WhatsApp" button
   - Browser opens new window to `wa.me/?text={message}`
   - Verify message contains quotation link
   - User can paste link to WhatsApp contact

2. **Email button:**
   - Click "Email" button
   - Prompt appears with client email pre-filled
   - Enter test email or leave pre-filled
   - Click OK
   - Wait for backend response
   - Success alert appears: "Email enviado correctamente"
   - Check server logs / email inbox for delivered PDF

3. **Error cases:**
   - Invalid email format: backend returns validation error
   - Network error: frontend shows "Error: {error message}"
   - Missing email field: backend returns 400

## Files Modified
- ✅ `backend/cotizador_project/pdf.py` — Added `enviar_pdf_por_email()` function
- ✅ `backend/cotizador_project/views.py` — Added `compartir_email` endpoint, updated imports
- ✅ `frontend/src/pages/Cotizaciones/Cotizaciones.jsx` — Added functions + buttons

## Dependencies
- No new Python packages required (uses Django's built-in `EmailMessage`)
- No new npm packages required (uses browser's native `fetch` and `encodeURIComponent`)

## Configuration Notes

### For Production Deployment
Update backend email settings in `tools_and_more/settings.py`:
```python
# Example: Gmail SMTP
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@aztools.com')
```

## Status
✅ **COMPLETE** — Phase 3 (Share PDF) fully implemented and ready for testing

## Next Steps (Future)
- [ ] SMS sharing (requires Twilio API)
- [ ] Bulk email sending with template customization
- [ ] Email delivery tracking and logging
- [ ] QR code in PDF (links to shared quotation)
- [ ] WhatsApp Business API integration (requires business account)
