# Cotización pública — QR y links que el cliente sí puede abrir

> **Estado:** Fase 1 implementada, desplegada y verificada (2026-07-07). Pendiente Fase 2: exponer a internet (Cloudflare Tunnel + dominio) para que los QR funcionen fuera de la red local.

## El problema

El QR de la cotización (y el link de WhatsApp) codifican `{origin}/cotizaciones/{id}` — la ruta **interna** de la app. Un cliente que lo escanea recibe:

1. **La pantalla de login** — la ruta exige sesión iniciada.
2. Aunque tuviera cuenta, el permiso es multi-tenant: solo usuarios de la organización dueña pueden ver esa cotización.
3. La URL apunta a la IP de la red local (`192.168.1.101:8080`): desde el celular del cliente (datos móviles o su propio wifi) **ni siquiera resuelve**.

Conclusión: el QR hoy no tiene ningún uso real para el cliente. El único canal que sí le llega es el email con PDF adjunto (cuando se configure el proveedor).

## Objetivo

Que escanear el QR (o abrir el link de WhatsApp) lleve al cliente a una **página pública de la cotización**: sin login, con la marca de la organización, la información que a él le interesa, y un botón para descargar el PDF.

## Diseño propuesto

### Token público (backend)

- Nuevo campo en `Cotizacion`: `token_publico` — UUID único, no editable, generado al crear.
- **Migración en 3 pasos** (obligatorio para no romper unicidad en filas existentes): (1) agregar campo nullable sin unique, (2) data migration que asigna un UUID distinto a cada cotización existente, (3) alter a `unique=True`. Con un solo `AddField(default=uuid4)` Django aplicaría el MISMO uuid a todas las filas existentes y la restricción única fallaría.
- El token es la única llave: no se puede adivinar (128 bits), no expone el ID secuencial, y quien tiene el link puede ver la cotización — igual modelo de seguridad que un link de Google Drive "cualquiera con el enlace".

### Endpoints públicos (`AllowAny`)

```
GET /api/publico/cotizaciones/<token>/       → JSON para la página pública
GET /api/publico/cotizaciones/<token>/pdf/   → descarga el PDF (mismo generar_pdf_cotizacion)
```

El JSON incluye **solo lo que le interesa al cliente** (no datos internos):
- Organización: nombre comercial, logo, color primario, teléfono/WhatsApp/email (para que pueda responder).
- Cotización: número, fecha, vigencia (`fecha_vencimiento`), estado.
- Items: servicio, cantidad, precio unitario, subtotal.
- Totales: subtotal, IVA (%, monto), total.
- NO incluye: notas internas, datos de otros clientes, IDs internos innecesarios.

### Página pública (frontend)

- Ruta **fuera del guard de autenticación**: `/c/<token>` (corta a propósito — menos densidad en el QR).
- Contenido, en orden de interés del cliente:
  1. Logo + nombre de la organización (con su color primario de marca).
  2. "Cotización COT-0015 · válida hasta 15/08/2026" (aviso destacado si ya venció).
  3. Tabla de servicios con cantidades y precios + totales grandes.
  4. Botón protagonista: **"Descargar PDF"**.
  5. Contacto de la organización ("¿Dudas? WhatsApp / teléfono / email") — el paso natural del cliente que quiere aceptar o negociar.
- Estados especiales: token inexistente → "Esta cotización no está disponible"; vencida → banner "Esta cotización venció el …, contactanos para actualizarla".

### Reapuntar QR y compartir

- `generarQR` y `abrirWhatsApp` en `CotizacionForm.jsx` pasan a usar `{FRONTEND_URL}/c/{token_publico}`.
- El serializer expone `token_publico` (read-only) para que el frontend construya el link.
- El mail de invitación no cambia (ya adjunta el PDF).

## La limitación honesta: el alcance de la red

Mientras la app viva solo en LAN + Tailscale, la página pública **solo la verán dispositivos dentro de tu red o tu Tailscale** — un cliente externo escaneando el QR desde su celular con datos móviles seguirá sin poder abrirla. Este rediseño deja el QR *correcto* (apunta a algo público y útil), pero su valor completo llega cuando se exponga la app a internet.

**Recomendación complementaria** (tarea aparte, ya en el roadmap como "TLS/HTTPS"): exponer solo lo necesario con **Cloudflare Tunnel** (gratis, sin abrir puertos del router, HTTPS incluido) apuntando un subdominio al servidor CasaOS. En ese momento, `FRONTEND_URL` pasa al dominio y los QR generados desde entonces funcionan para cualquiera. Los QR ya impresos con la IP vieja habría que regenerarlos — razón de más para hacer este cambio antes de repartir QRs.

## Decisiones explícitas

- **¿Página pública o descargar el PDF directo?** Página. El PDF directo funciona, pero la página da contexto (vigencia, contacto, marca) y el botón de PDF está a un toque. Además una URL que abre una página se siente confiable; una que descarga un archivo de golpe, menos.
- **¿Por qué token UUID y no el ID?** El ID es secuencial: cualquiera podría iterar `/c/1`, `/c/2`… y leer cotizaciones ajenas. El UUID hace la URL imposible de adivinar.
- **¿Expirar el link?** No en fase 1. El dueño controla a quién se lo da; una cotización vencida se muestra con aviso de vencida (información útil), no con un 404 (frustración).

## Fases

- **Fase 1**: token + migración 3 pasos, endpoints públicos, página `/c/<token>`, reapuntar QR y WhatsApp. Verificable de inmediato dentro de la red.
- **Fase 2** (cuando se decida exponer a internet): Cloudflare Tunnel + dominio + `FRONTEND_URL` actualizado.

## Verificación cuando se implemente

1. Escanear el QR desde un dispositivo en la red **sin sesión iniciada** → ve la página pública con logo, items, totales y botón PDF (no la pantalla de login).
2. El PDF descarga sin token de autenticación.
3. `/c/<token-inventado>` → mensaje "no disponible", no error crudo ni datos.
4. Una cotización con `fecha_vencimiento` pasada muestra el banner de vencida.
5. El JSON público no contiene campos internos (revisar respuesta a mano).
6. Las cotizaciones existentes (creadas antes de la migración) tienen token y funcionan.
7. WhatsApp comparte el link público nuevo.
