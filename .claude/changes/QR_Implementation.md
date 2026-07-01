# QR Code Manager Implementation

## Resumen
Implementación completa del QR Code Manager app (Phase 4b) como app independiente Django + React frontend con UI de 3 tabs.

## Backend (`qr_app`)

### Modelo: CodigoQR
- **organization** (FK → Organization): Multi-tenant scoping
- **titulo** (CharField): Nombre del código
- **url_data** (URLField): URL que codifica el QR
- **png_data** (BinaryField): PNG binario generado
- **color_fg** (CharField hex): Color foreground (#000000)
- **color_bg** (CharField hex): Color background (#FFFFFF)
- **logo** (ImageField, opcional): Logo/imagen en centro
- **forma** (CharField choices): 'square' o 'rounded'
- **descargado_veces** (IntegerField): Analytics counter
- **creado_por** (FK → User): Auditoría
- **creado, actualizado** (timestamps)

### Endpoints REST

#### POST `/api/qr/generar/` — Generate on-the-fly
```json
Request: {
  "url_data": "https://example.com",
  "titulo": "Mi QR",
  "color_fg": "#000000",
  "color_bg": "#FFFFFF",
  "forma": "square",
  "guardar": false
}

Response (sin guardar):
{
  "png_base64": "iVBORw0KGgo...",
  "url_data": "https://example.com"
}

Response (guardar=true):
{
  "id": 1,
  "titulo": "Mi QR",
  "url_data": "https://example.com",
  "color_fg": "#000000",
  "color_bg": "#FFFFFF",
  "forma": "square",
  "descargado_veces": 0,
  "creado": "2026-07-01T10:30:00Z",
  "png_base64": "iVBORw0KGgo..."
}
```

#### CRUD: `/api/qr/codigos/`
- `GET` — List todos los QRs del usuario (organization-filtered)
- `POST` — Create nuevo QR (deprecated, usar `/generar/` en su lugar)
- `DELETE /api/qr/codigos/{id}/` — Delete QR

#### GET `/api/qr/codigos/{id}/descarga/` — Download PNG
- Retorna PNG binary con Content-Type: image/png
- Incrementa `descargado_veces` en cada descarga
- Response: FileResponse con filename

#### POST `/api/qr/codigos/{id}/compartir/` — Share via email
```json
Request: {
  "email": "user@example.com"
}

Response: {
  "success": true,
  "message": "QR compartido a user@example.com"
}
```

### Tecnología
- **Generación QR**: librería `qrcode[pil]>=7.4`
- **Almacenamiento**: BinaryField (PNG bytes en DB)
- **Colores**: Hex color picker en frontend, validación basic
- **Permisos**: `HasRolPermission` + `OrganizationFilterMixin` (org-scoped)

### Archivos creados
- `backend/qr_app/models.py` — CodigoQR model
- `backend/qr_app/serializers.py` — Serializers + GenerarQRSerializer
- `backend/qr_app/views.py` — ViewSet con actions (generar, descarga, compartir)
- `backend/qr_app/urls.py` — Router + URL routing
- `backend/qr_app/admin.py` — Admin registration
- `backend/qr_app/apps.py` — AppConfig
- `backend/qr_app/tests.py` — Basic test sample
- `backend/qr_app/migrations/0001_initial.py` — Auto-generated migration

### Cambios en proyecto
- `backend/requirements.txt` — Agregado `qrcode[pil]>=7.4`
- `backend/tools_and_more/settings.py` — Agregado `'qr_app'` a INSTALLED_APPS
- `backend/tools_and_more/urls.py` — Agregado `path('api/qr/', include('qr_app.urls'))`

## Frontend (`QR.jsx`)

### Estructura de 3 Tabs

#### Tab 1: Generar QR
- **Formulario:**
  - URL (required, URLField)
  - Título (optional, CharField)
  - Color foreground (color picker, #000000 default)
  - Color background (color picker, #FFFFFF default)
  - Forma (radio buttons: Cuadrado | Redondeado)
  - Preview en vivo usando `qrcode.react`

- **Acciones:**
  - "Generar Preview" (sin guardar) → Retorna base64 PNG, muestra preview
  - "Guardar QR" (guarda en DB) → POST generar con guardar=true → reload tabla

#### Tab 2: Mis QRs
- **Tabla de QRs guardados:**
  - Columnas: Preview (thumbnail), Titulo, URL (truncada), Descargas, Creado (fecha)
  - Actions: Descargar, Compartir (email), Eliminar
  - Vacío → "Sin QRs guardados"

- **Iconos lucide-react:**
  - Download → Descargar PNG
  - Share2 → Abre prompt para email
  - Trash2 → Delete con confirmación

#### Tab 3: Galería
- **Grid view (3 columnas) de tarjetas:**
  - Thumbnail del QR
  - Título
  - URL truncada
  - Botones: Download, Share, Delete (más compactos)
  - Click en tarjeta expande detalles

### Estado y Flujo
```javascript
const [codigos, setCodigos] = useState([])    // Lista de QRs
const [form, setForm] = useState({...})       // Form fields
const [previewPng, setPreviewPng] = useState() // Preview base64
const [loading, setLoading] = useState(true)   // Initial load
const [submitting, setSubmitting] = useState()  // Form submit state
```

### API Calls
- `GET /api/qr/codigos/` — Load list on mount
- `POST /api/qr/generar/` — Preview + Save
- `GET /api/qr/codigos/{id}/descarga/` — Download (FileResponse → blob)
- `DELETE /api/qr/codigos/{id}/` — Delete
- `POST /api/qr/codigos/{id}/compartir/` — Share by email

### UI/UX
- **Iconografía:** lucide-react (Download, Share2, Trash2, Plus) — consistente con Finanzas app
- **Colores:** Preview muestra QR con colores seleccionados en tiempo real
- **Mensajes:** Error handling con alerts/status messages
- **Responsive:** Grid collapses a 1 col en mobile (flexbox)

### Archivos creados
- `frontend/src/pages/QR/QR.jsx` — Main component (3 tabs)
- `frontend/src/pages/QR/` — New directory

### Cambios en proyecto
- `frontend/src/App.jsx` — Agregado import + ruta `/qr`
- `frontend/package.json` — Agregado `qrcode.react` dependency

## Testing Checklist

### Backend
- [ ] `python manage.py migrate qr_app` → OK
- [ ] `POST /api/qr/generar/` con URL válida → retorna base64 PNG
- [ ] `POST /api/qr/generar/` con guardar=true → salva en DB, retorna ID
- [ ] `GET /api/qr/codigos/` → lista filtrada por org
- [ ] `GET /api/qr/codigos/{id}/descarga/` → retorna PNG binary, incrementa counter
- [ ] `DELETE /api/qr/codigos/{id}/` → elimina de DB
- [ ] `POST /api/qr/codigos/{id}/compartir/` → envía email con attachment

### Frontend
- [ ] Navegar a `/qr` → carga con 3 tabs
- [ ] Tab Generar: Ingresar URL → click Generar Preview → muestra QR
- [ ] Cambiar colores → preview actualiza en tiempo real
- [ ] Tab Generar: Llenar título + click Guardar → aparece en Tab 2
- [ ] Tab Mis QRs: Ver tabla con thumbnails
- [ ] Click Descargar → descarga PNG
- [ ] Click Compartir → prompt email → envía
- [ ] Click Eliminar → confirmación → elimina de tabla
- [ ] Tab Galería: Ver grid 3 cols con QRs como tarjetas
- [ ] Responsivo: Resize a mobile → grid collapses a 1 col

## Notas Técnicas

### Decisiones de Diseño
1. **QR Generation:** Backend genera con `qrcode[pil]`, frontend puede previsualizar con `qrcode.react` (no genera PNG, solo SVG)
2. **PNG Storage:** BinaryField en DB (simple, no requiere filesystem)
3. **Colores:** Hex picker (HTML5 native, no dependency)
4. **Email Sharing:** Similar a PDF sharing en Cotizaciones (EmailMessage con attachment)
5. **Analytics:** `descargado_veces` counter incrementa en cada descarga

### Performance
- Lazy load QRs solo en Tab 2/3 (on demand)
- Preview SVG (qrcode.react) en Tab 1, no genera PNG hasta guardar
- PNG binario en DB (pequeño, típicamente < 5KB)

### Seguridad
- Multi-tenant: OrganizationFilterMixin + FK constraints
- Email validation: Basic (Django URLField)
- PNG generation: Server-side, trusted input (URL)

### Futuras Mejoras
- Logo upload + placement en centro del QR
- Batch download de múltiples QRs (ZIP)
- Analytics dashboard (trending, most downloaded)
- QR templates (diferentes formas/estilos)
- Integración con cotizaciones PDF (incluir QR code)
- Dynamic QR codes (redirect URLs)

## Git Status
- ✅ Backend: models, serializers, views, urls, admin, migrations created + applied
- ✅ Frontend: QR.jsx component created, App.jsx routing updated
- ✅ Dependencies: qrcode[pil] + qrcode.react installed
- ✅ Settings: registered in INSTALLED_APPS, URL routing configured
- 📝 Ready for testing
