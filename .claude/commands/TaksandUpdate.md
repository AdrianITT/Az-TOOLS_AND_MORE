# 📋 Project Roadmap

## 🐛 Current Issues

- [x] Adding new attributes to a service is difficult and requires code changes. — resolved via EAV system (`AtributoPlantilla`), attributes are now managed from the UI, no code changes needed.
- [x] Improve the overall user experience (UI/UX) — consistency pass across list pages. Audited every page under `pages/` and found `Clientes.jsx` and `Usuarios.jsx` were outliers: their initial `load()` calls had no `.catch`, so a failed `GET` silently rendered an empty table instead of an error (every other list page — Servicios, Cotizaciones, QR, Fibras — already handled this). Added `.catch(() => setError(...))` to both, moved the error `<p>` to page level so it's visible whether or not the create/edit form is open, and gave `Usuarios.jsx`'s `cancelarInvitacion` a try/catch (it had none, so a failed cancel also failed silently). Also swapped three call sites that hand-rolled `err.data?.detail || err.data?.field?.[0]` (`Usuarios.jsx`, `AceptarInvitacion.jsx`, `CrearOrganizacion.jsx`) for the shared `getErrorMessage()` helper already used everywhere else, so field-level validation errors surface consistently instead of falling back to a generic message.
- [x] Enhance the visual design of the Service and Quote forms — specifically, make unsaved changes clearly visible. `ServicioForm.jsx` and `CotizacionForm.jsx` now show a "Cambios sin guardar" pill (reusing the existing `pendingBadge` style) whenever `isDirty` is true, and `ServicioForm`'s submit button is now disabled while editing with no changes (matching `CotizacionForm`'s existing behavior). `Organizacion.jsx`'s ad-hoc dirty-hint text was swapped for the same badge so all three main forms share one visual language for "unsaved" state.
- [x] Improve the workflow for adding services to a quote. — pending-item indicator + highlight-on-add feedback implemented in `CotizacionForm.jsx`.
- [x] Allow editing client data after creation, since users can make mistakes when entering it. — backend `ClienteViewSet` already supported `PATCH` (gated by the `editar` permission); the gap was the frontend, which only had a create form. Added an "Editar" action per row in `Clientes.jsx` that populates the same form (now including `nombre_personal`, `cedula`, `nombre_empresa`, `ruc`, `direccion`) and submits via `PATCH /clientes/:id/` instead of `POST` when editing.
- [~] User invitation emails never arrive. Root cause: `EMAIL_BACKEND` defaulted to the console backend (prints instead of sending) — not a bug, just never configured. Fixed two real bugs found along the way: (1) `InvitacionViewSet.perform_create` let a failed `send_mail()` raise all the way up to a `500`, even though the `Invitacion` row (with a valid token) was already committed — now wrapped in `try/except` + logged, so the invite is created regardless of email delivery (`views.py`). (2) Upgraded `_enviar_email_invitacion` from plain text to a proper HTML+text `EmailMultiAlternatives`, styled with the org's `color_primario`, a "Crear mi cuenta" button, and expiration date — done and working, independent of provider. **Blocked on provider choice**: tried Resend (sandbox only delivers to the account's own registered email, unusable for real invites without domain verification — no domain owned yet) and Gmail SMTP with the user's personal address (works, but user doesn't want to send invites *from* their personal Gmail). Options on the table, none picked yet: (a) create a dedicated Gmail account just for this and use its app password, (b) SendGrid Single Sender Verification (no domain needed, verifies any inbox via a confirmation link, 100/day free), (c) buy and verify a domain with Resend (cleanest long-term, costs ~$10-15/yr). Whichever is chosen, only `backend/.env` needs updating — the code (`settings.py` env-driven SMTP config, `views.py` HTML template) already supports any standard SMTP provider.

---

## 🚀 Planned Features

### Quote Management

- [x] Generate and download quotes as PDF.
- [x] Share generated PDFs through:
  - [x] WhatsApp
  - [x] Gmail (email)
- [x] Make the IVA (tax) percentage editable per quote, starting from 0% upward. — `iva_porcentaje` field added to `Cotizacion` model (default 16%, migration `0005_cotizacion_iva_porcentaje`), used in `calcular_totales()`, writable via `CotizacionSerializer` (`min_value=0`), recalculated on update, reflected dynamically in the PDF (was hardcoded "16%" in two places). Editable input added in `CotizacionForm.jsx` plus a Subtotal/IVA/Total breakdown.
- [x] Fix: the logo does not display in the generated quote PDF. — root cause: `Organization.logo` existed on the model/PDF template (`_logo_data_uri()` in `pdf.py`), but there was **no API endpoint or frontend UI** to ever upload one, so it was always empty and the PDF fell back to initials. Added `GET/PATCH /api/organizacion/` (`OrganizacionActualView`, gated by `puede_gestionar_usuarios`, multipart support for the logo file, absolute media URL via serializer `context`) and a new "Mi organización" page (`pages/Organizacion/Organizacion.jsx`, route `/organizacion`, sidebar entry) with a logo upload + preview and the org's other editable fields (nombre, email, color de marca, etc.). Verified end-to-end: uploaded a logo via the API and confirmed the generated PDF now embeds it (`/Subtype/Image` object present).

### Financial Dashboard

Create a backend application to manage business finances, including:

- [x] Income tracking
- [x] Expense tracking
- [x] Financial reports
- [x] Dashboard with statistics

This application should be able to work:
- Independently.
- Integrated with the Quote System.

### QR Code Manager

Create a backend application for QR code management.

Features:

- [x] Generate QR codes.
- [x] Save generated QR codes.
- [x] Share QR codes.
- [x] Customize:
  - [x] Shape
  - [x] Colors
  - [x] Style (beyond shape/color presets)
  - [x] Logo (noted as future improvement in QR_Implementation.md)
- [x] Frontend interface for managing QR codes.

This application should be able to work:
- Independently.
- Integrated with the Quote System.

### Organization Module (Company Settings)

Centralize all company data — identity, contact, address, social links, logo, and brand colors — as the single source of truth consumed by quotes, PDFs, and the app UI.

- [x] General info: `nombre`, `nombre_comercial`, `descripcion`, `ruc` (RFC), `giro`.
- [x] Contact info: `email`, `telefono`, `whatsapp`, `sitio_web`.
- [x] Full address: `calle`, `numero_exterior`, `colonia`, `ciudad`, `estado`, `pais`, `codigo_postal`.
- [x] Social links: `facebook`, `instagram`, `twitter`, `linkedin`.
- [x] Logo upload with drag & drop, preview, and removal (`remove_logo` flag on `PATCH /api/organizacion/`); already reused automatically in quote PDFs.
- [x] Brand color palette ("Apariencia" panel): `color_primario`, `color_fondo`, `color_superficie`, `color_texto`, `color_menu_fondo`, `color_menu_texto` — hex-validated on both backend (`OrganizationSerializer`) and frontend, with live preview of sidebar/card/button before saving and a "Restablecer colores por defecto" button.
- [x] Colors are applied app-wide at runtime (`utils/theme.js` sets CSS custom properties on `:root` from `App.jsx` on load) without touching `variables.css`, which stays as the default fallback.
- [x] Migration `0006_organization_calle_organization_codigo_postal_and_more` adds all new fields to `Organization`.
- [x] Multiple branches / additional corporate themes. New `Sucursal` model (migration `0008_sucursal`, `organization` FK, unique `nombre` per org): its own contact (`email`, `telefono`), full address, and an optional color-theme override (same 6 fields as `Organization`, all nullable — blank means "inherit the org's palette"). `SucursalViewSet` (CRUD, `OrganizationFilterMixin`, gated by `PuedeGestionarUsuarios` like the Organización page) at `/api/sucursales/`. Frontend: new `pages/Sucursales/Sucursales.jsx` (list + inline create/edit form, following the `Clientes.jsx` pattern) with a collapsible "Tema de colores propio" section reusing color pickers, delete via `ConfirmDialog`, and a sidebar entry ("Sucursales", under Administración, same permission gate as "Mi organización"). Verified end-to-end against the running dev servers: create, list, hex-color validation (rejects non-hex), and delete all confirmed via direct API calls.
- [~] Billing data (scoped down from the original "billing data, digital signature, stamps" — signature/stamps dropped as a separate, higher-risk project involving sensitive files/crypto). Data layer done: `razon_social`, `regimen_fiscal`, `uso_cfdi_default` added to `Organization` (migration `0007_organization_razon_social_and_more`) with curated SAT catalogs (`REGIMEN_FISCAL_CHOICES`, `USO_CFDI_CHOICES`), exposed via `OrganizationSerializer`. **Intentionally not user-facing yet**: the "Facturación" tab UI exists in `Organizacion.jsx` but is left out of the `TABS` array (commented above it) so it's unreachable until the flow is finished.

### PDF Tools

New standalone module (`pdf_tools_app` backend + `pages/PDFTools` frontend) for general-purpose PDF utilities, independent from the quoting PDF flow.

- [x] Images to PDF.
- [x] Merge PDFs.
- [x] Word to PDF.
- [x] Split PDF.
- [x] PDF to images.
- [x] Edit pages (inspect + reorder/delete pages).

### FIBRAs Investment Simulation

Added under Finanzas: a catalog of Mexican FIBRAs (real estate investment trusts) with historical data, an investment simulator, and simulation history, plus integration into the services/attributes and quote flow.

- [x] FIBRAs catalog and detail view (`FibraViewSet`, `FibrasCatalogo.jsx`, `FibraDetalle.jsx`).
- [x] Investment simulation (`SimularView`, `SimulacionForm.jsx`, `SimulacionResultado.jsx`).
- [x] Simulation history per organization (`SimulacionInversionViewSet`, `Historial.jsx`).
- [x] Integrated into the services/attributes and quote system (per commit `0d2e499`).
- [ ] Automatic data sync (`sync_fibras` management command exists and works, but nothing triggers it — currently 100% manual). A local macOS `launchd` job was set up and verified working, then **reverted** once it was decided this machine won't be the final host. Deferred until hosting is decided — inside Docker the likely mechanism is a dedicated cron container (`supercronic`/`ofelia`) alongside the app, tracked as part of [Dockerization](Dockerization.md).

### Dockerization

Full plan documented in [Dockerization.md](Dockerization.md). Target use case: self-hosting at home or handing off to a small business on demand.

- [x] Externalized `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` to env vars via `django-environ` (`backend/tools_and_more/settings.py`), with defaults that preserve today's local-dev behavior when no `.env` overrides are present.
- [x] `DATABASES` now reads `DATABASE_URL` when present (Postgres, via `env.db()`) and falls back to SQLite otherwise — local dev is unaffected, Docker sets `DATABASE_URL` to point at the `db` service.
- [x] `whitenoise` added for serving static files from the Django process itself (`STORAGES['staticfiles']`, middleware), avoiding a shared static volume with nginx.
- [x] Media (`/media/`) is now served by Django unconditionally (previously gated by `DEBUG`), since this self-hosted setup has no external object storage.
- [x] New `wait_for_db` management command (`cotizador_project/management/commands/wait_for_db.py`) — entrypoint waits for Postgres to accept connections before running migrations.
- [x] `backend/Dockerfile` (Python 3.12-slim + weasyprint system libs: pango, cairo, gdk-pixbuf, fonts, libpq5) + `backend/entrypoint.sh` (wait_for_db → migrate → collectstatic → gunicorn) + `backend/.dockerignore`.
- [x] `frontend/Dockerfile` (multi-stage: `node:20-alpine` build → `nginx:alpine` serve) + `frontend/nginx.conf` (serves the SPA, proxies `/api`, `/media`, `/static` to `backend:8000`) + `frontend/.dockerignore`.
- [x] Root `docker-compose.yml` (3 services: `db` Postgres 16, `backend`, `frontend`) with named volumes for `postgres_data`, `media`, `staticfiles`, and a healthcheck-gated `depends_on` so backend waits for Postgres to be healthy.
- [x] Root `.env.example` documenting all required variables (`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `POSTGRES_*`, `HTTP_PORT`).
- [x] **Verified end-to-end** with a real `docker compose build && up`: both images build clean (found and fixed one real issue — `libgdk-pixbuf2.0-0` was renamed to `libgdk-pixbuf-2.0-0` in current Debian trixie, the base of `python:3.12-slim`), migrations ran clean against a fresh Postgres container, `collectstatic` ran via whitenoise, gunicorn started with 3 workers, nginx served the SPA (`200`) and proxied `/api` correctly (`401` without a token — proves the proxy reaches Django, not a connection failure), and a full registration write (`POST /api/organizaciones/registro/` → `201`) was confirmed to land in the actual Postgres table via `psql`. Test containers/volumes torn down afterward (`docker compose down` + volume cleanup).
- [ ] `sync_fibras` cron container (`supercronic`/`ofelia`) — still pending, see FIBRAs section above.
- [ ] Not yet done: SQLite → Postgres **data** migration for the existing local dataset (dumpdata/loaddata or pgloader) — today's local SQLite data was not migrated, only verified that a fresh Postgres schema works.
- [ ] Not yet done: reverse proxy TLS/HTTPS (fine for local/home network use over HTTP; needed before exposing to the internet for a client).