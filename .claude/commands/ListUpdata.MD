# Tasks - Mejoras del Proyecto

## Objetivo General

Realizar las siguientes mejoras en los módulos de **Finanzas**, **FIBRAS**, **PDF**, **Código QR**, **Invitaciones** y **Cotizaciones**.

Antes de implementar cualquier cambio:

* Analiza la arquitectura existente para mantener la consistencia del proyecto.
* Respeta la estructura actual del backend (Django REST Framework) y del frontend (React + Vite).
* Reutiliza componentes y lógica existente siempre que sea posible.
* No rompas funcionalidades ya implementadas.
* Si detectas problemas adicionales durante el desarrollo, corrígelos siempre que estén relacionados con el módulo en cuestión.

---

# 1. Módulo de Finanzas

Componente principal: `frontend/src/pages/Finanzas/Finanzas.jsx`.
Backend: `backend/finanzas_app/models.py` (modelos `CategoriaIngreso`, `Ingreso`, `CategoriaGasto`, `Gasto`; no existe un modelo unificado "Movimiento", cada tipo vive en su propio modelo/tabla).
Endpoints actuales: `/finanzas/categorias-ingresos/`, `/finanzas/categorias-gastos/`, `/finanzas/resumen-por-categoria/`.

## 1.1 Detalle de movimientos en el Resumen Mensual

### Problema

`Finanzas.jsx` ya incluye la tabla **"Resumen Mensual (últimos 12 meses)"** (alrededor de la línea 522) y **"Resumen por Categoría (Ingresos)"** (línea 537), pero ambas son solo totales agregados en tablas. No existe ningún drill-down: no hay forma de ver qué `Ingreso`/`Gasto` individuales componen el total de un mes.

### Objetivo

Agregar una opción para visualizar el detalle de cada mes (por ejemplo, al hacer clic en una fila de la tabla de Resumen Mensual, abrir un modal o expandir la fila).

### Requerimientos

Al seleccionar un mes, mostrar el listado de `Ingreso`/`Gasto` de ese periodo, consultando los modelos existentes (posiblemente se necesite un nuevo endpoint de detalle, ya que los actuales solo devuelven agregados).

Cada movimiento deberá incluir como mínimo:

* Fecha.
* Concepto o descripción.
* Cantidad.
* Tipo de movimiento (Ingreso o Gasto), y su categoría (`CategoriaIngreso`/`CategoriaGasto`).

Si existen más campos relevantes en `Ingreso`/`Gasto` (por ejemplo notas u observaciones), inclúyelos siempre que aporten valor al usuario.

---

## 1.2 Gráficas

Agregar visualizaciones en `Finanzas.jsx`, que hoy es 100% tabular (no usa gráficas).

El proyecto ya usa `recharts` (`^3.9.1`, ya está en `package.json`) en `Dashboard.jsx` y en `Fibras/FibraDetalle.jsx` / `Fibras/SimulacionResultado.jsx` — **reutilizar esa misma librería y, si existen, los mismos componentes/estilos de gráfica** en lugar de introducir una nueva dependencia.

### Gráfica 1

Mostrar los días en los que hubo mayor gasto (usando los datos de `Gasto`, agrupados por fecha).

Ejemplo:

* Día con mayor gasto.
* Monto gastado por día.
* Comparativa entre días.

### Gráfica 2

Mostrar en qué categorías (`CategoriaGasto`) se está gastando más dinero. Se puede apoyar en el mismo endpoint `/finanzas/resumen-por-categoria/` si ya expone gastos, o extenderlo si solo cubre ingresos.

La información debe ser clara, fácil de interpretar y útil para detectar patrones de gasto.

---

# 2. Módulo de FIBRAS (RESUELTO)

Componentes: `frontend/src/pages/Fibras/` (`FibrasCatalogo.jsx`, `FibraDetalle.jsx`, `Historial.jsx`, `SimulacionForm.jsx`, `SimulacionResultado.jsx`).

## Problema

En `SimulacionForm.jsx` (alrededor de las líneas 148-152), las fechas de inicio y fin son simples `<Input type="date">` con `<Field label="Fecha de inicio">` / `<Field label="Fecha de fin">`, sin ningún texto de ayuda, tooltip ni descripción adicional. No queda claro qué representan dichas fechas:

* ¿Es el periodo histórico?
* ¿Es el periodo para calcular dividendos?
* ¿Es el periodo de inversión?
* ¿Es el rango de consulta?

## Objetivo

Mejorar la experiencia de usuario en `SimulacionForm.jsx` (y en `FibraDetalle.jsx`/`Historial.jsx` si manejan fechas similares).

### Requerimientos

Analizar el flujo completo (`SimulacionForm.jsx` → `SimulacionResultado.jsx`) y agregar, sin sobrecargar la interfaz:

* Textos de ayuda o descripciones bajo cada campo de fecha.
* Tooltips explicando qué representa cada fecha en el cálculo de la simulación.
* Placeholders o ejemplos.
* Mensajes informativos sobre qué pasará al ejecutar la simulación.
* Validaciones (por ejemplo, fecha de fin posterior a fecha de inicio).

### Validación

Realizar pruebas completas del flujo `SimulacionForm.jsx` → `SimulacionResultado.jsx`:

* Carga inicial.
* Cambio de fechas.
* Consulta de información.
* Cálculos.
* Casos límite (fechas iguales, fecha de inicio posterior a fecha de fin, rangos muy amplios).
* Manejo de errores.

Corregir cualquier problema encontrado durante las pruebas.

## Resolución aplicada (2026-07-05)

En `SimulacionForm.jsx`:
* Se agregó un párrafo explicativo al inicio del formulario aclarando que es un **backtest histórico** (invierte en la fecha de inicio, evalúa hasta la fecha de fin, con datos reales).
* Se agregó `hint` (texto de ayuda bajo el label) y `title` (tooltip nativo al pasar el mouse) a los campos "Fecha de inicio" y "Fecha de fin", explicando qué representa cada una.
* Se agregó un resumen dinámico ("Se simulará una inversión desde el DD/MM/YYYY hasta el DD/MM/YYYY (X años y Y meses)") que se actualiza en tiempo real al cambiar las fechas.
* Se agregó validación de rango: `fecha_fin` no puede ser anterior o igual a `fecha_inicio`, ni futura. Se valida tanto inline (mensaje en rojo bajo el campo + botón "Simular" deshabilitado) como al enviar el formulario (mirroring de la validación del backend en `serializers.py`).
* Se agregaron atributos nativos `min`/`max` en los `<input type="date">` para acotar el rango directamente en el selector de fecha del navegador.
* Se agregó soporte de `hint` al componente reutilizable `Field` (`components/ui/Input.jsx`), sin romper ningún otro uso existente.

### Verificación (pruebas de flujo completo)

Probado con navegador real (Chromium vía Playwright) en un entorno local aislado (SQLite, no producción), con datos históricos sintéticos de precios/dividendos para `FUNO11.MX`:
* Carga inicial: texto explicativo, hints y resumen dinámico visibles desde el primer render.
* Cambio de fechas: resumen se actualiza correctamente.
* Caso límite fecha_fin < fecha_inicio: error inline + botón deshabilitado.
* Caso límite fechas iguales: mismo comportamiento (rechazado).
* Tooltips nativos (`title`) presentes en ambos campos.
* Simulación completa con FUNO11.MX: resultado, gráficas de crecimiento y proyección de dividendos se renderizan correctamente.
* Sin errores en consola del navegador en todo el flujo.

Detalle completo en `changes/PRUEBAS_FIBRAS_UX.md`.

---

# 3. Apartado "Proteger PDF con contraseña" (RESUELTO)

Backend: `backend/pdf_tools_app/services/protect_pdf.py` (incluye `protect_pdf` y `unlock_pdf`), vista y endpoint en `backend/pdf_tools_app/views.py` / `urls.py` → `POST /api/pdf/protect/`.
Frontend: `frontend/src/pages/PDFTools/ProtectPDF/`.

## Problema

Al seleccionar archivo, escribir contraseña y nombre, y presionar **Proteger**, aparece:

> No se pudo procesar. Ocurrió un error al procesar los archivos.

### Error en consola

`POST /api/pdf/protect/` → HTTP 413 (Request Entity Too Large)

### Causa confirmada

Se verificó que **no hay ningún límite de tamaño de subida configurado en todo el stack**:

* `backend/tools_and_more/settings.py` no define `DATA_UPLOAD_MAX_MEMORY_SIZE` ni `FILE_UPLOAD_MAX_MEMORY_SIZE` (Django cae en su default de 2.5 MB, que es probablemente la causa real del 413).
* `frontend/nginx.conf` no define `client_max_body_size` en ningún `location`, por lo que Nginx también aplica su default (1 MB) antes de que la petición llegue siquiera al backend.
* `backend/entrypoint.sh` lanza gunicorn sin `--timeout` (default 30s) y sin límite de tamaño de request explícito.
* `docker-compose.yml` no agrega configuración adicional de proxy/tamaño.

## Objetivo

Corregir el problema de forma definitiva, de forma consistente en las tres capas:

* Aumentar `DATA_UPLOAD_MAX_MEMORY_SIZE` y `FILE_UPLOAD_MAX_MEMORY_SIZE` en `backend/tools_and_more/settings.py` a un valor acorde al tamaño máximo de PDF que se quiera soportar.
* Agregar `client_max_body_size` en los `location` relevantes de `frontend/nginx.conf`.
* Revisar si el timeout default de gunicorn (30s) es suficiente para archivos grandes; si no, ajustar `--timeout` en `backend/entrypoint.sh`.
* Aplicar el mismo criterio de tamaño a los demás endpoints de PDF (ver secciones 4, 5 y 6), ya que comparten la misma causa raíz.

## Resolución aplicada (2026-07-05)

* `backend/tools_and_more/settings.py`: nueva variable `MAX_UPLOAD_SIZE_MB` (default 150) usada para `DATA_UPLOAD_MAX_MEMORY_SIZE` y `FILE_UPLOAD_MAX_MEMORY_SIZE`.
* `frontend/nginx.conf`: `client_max_body_size 150M;` a nivel `server`, más `proxy_read_timeout`/`proxy_send_timeout 120s` en `/api/` para operaciones lentas.
* `backend/entrypoint.sh`: gunicorn ahora usa `--timeout "${GUNICORN_TIMEOUT:-120}"` (antes 30s por default).
* `.env` / `.env.example`: documentada la nueva variable.

**Hallazgo importante durante la implementación**: `pdf_tools_app/serializers.py` ya tenía un límite de aplicación de `MAX_FILE_SIZE_MB = 25` por archivo (con mensaje de error claro) y `MAX_FILES = 30` por petición, no detectado en el relevamiento inicial. Por eso el límite de infraestructura se fijó en 150MB (no 50MB): debe ser mayor al límite de negocio por archivo para no enmascarar el mensaje de error de la aplicación con un 413 genérico, y para dar margen a "Unir PDFs" con varios archivos a la vez.

Verificado con `curl` contra PDFs reales (no vacíos) de ~10MB, ~20MB, ~30MB y ~59MB: los que antes fallaban con 413 ahora responden 200, y los que exceden el límite de negocio (25MB) responden 400 con mensaje claro en vez de 413. Detalle completo, incluyendo la limitación de no haber podido probar el stack completo con Nginx real (requiere rebuild de producción), en `changes/PRUEBAS_LIMITES_PDF.md`.

---

# 4. PDF → Word (RESUELTO)

Backend: `backend/pdf_tools_app/services/pdf_to_word.py`, endpoint `POST /api/pdf/pdf-to-word/`.
Frontend: `frontend/src/pages/PDFTools/PdfToWord/`.

## Problema

En consola: `POST /api/pdf/pdf-to-word/` → HTTP 400 (Bad Request)

Mensaje mostrado:

> No se generó el archivo Word. El PDF puede tener contenido no convertible.

## Objetivo

Investigar la causa real del error dentro de `pdf_to_word.py` y la vista correspondiente en `views.py`.

Validar:

* Si el backend está lanzando el 400 genuinamente por contenido no convertible o por otra excepción no relacionada que se está enmascarando con ese mensaje.
* Si el frontend (`PdfToWord.jsx`) envía correctamente el archivo (`FormData`, headers).
* Si la librería utilizada en `pdf_to_word.py` soporta el tipo de PDF que falla (por ejemplo PDFs escaneados/basados en imágenes sin texto).
* Manejo de excepciones y validaciones en el servicio y en la vista.

Si el PDF realmente no puede convertirse, mostrar un mensaje mucho más claro indicando el motivo exacto (por ejemplo, "el PDF no contiene texto seleccionable" vs. un error genérico).

## Causa raíz real y resolución aplicada (2026-07-05)

**No era un problema de "contenido no convertible".** Se reprodujo localmente: `libreoffice --headless --convert-to docx` abre los PDF con su componente **Draw** (no Writer), que no tiene filtro de exportación a docx/odt/txt — falla con `exit code 0` y sin generar archivo, para **cualquier PDF**, no solo los escaneados. Además, bajo concurrencia (varios workers de gunicorn), dos conversiones de LibreOffice headless simultáneas compiten por el mismo perfil de usuario y fallan de forma intermitente.

Se reemplazó la implementación completa: ahora `pdf_to_word.py` usa la librería **`pdf2docx`** (agregada a `requirements.txt`), que convierte el PDF directamente sin depender de LibreOffice ni de subprocesos externos. Antes de convertir, se verifica con PyMuPDF si el PDF tiene texto seleccionable; si no lo tiene, se informa con el mensaje específico solicitado ("Este PDF no tiene texto seleccionable..."). `libreoffice-writer` se mantiene en el Dockerfile solo para la conversión `.doc` → PDF de `word_to_pdf.py`, que no se tocó.

Verificado con `curl` y navegador real: PDF normal (200, docx válido), PDF escaneado (400, mensaje claro), archivo corrupto (400, mensaje claro — se encontró y corrigió un 500 propio durante la prueba), y dos conversiones concurrentes (ambas 200, ya sin la contención de LibreOffice). Detalle completo en `changes/PRUEBAS_PDF_A_WORD.md`.

---

# 5. Comprimir PDF (RESUELTO)

Backend: `backend/pdf_tools_app/services/compress_pdf.py`, endpoint `POST /api/pdf/compress/`.
Frontend: `frontend/src/pages/PDFTools/CompressPDF/`.

## Problema

En consola: `POST /api/pdf/compress/` → HTTP 500 (Internal Server Error)

Mensaje mostrado:

> Ocurrió un error al procesar los archivos.

## Objetivo

Investigar la causa del error 500 en `compress_pdf.py` y en la vista de `views.py` que lo invoca.

Corregir:

* Manejo de excepciones en el servicio (capturar y traducir errores de la librería a respuestas HTTP controladas, no un 500 sin información).
* Verificar que la librería utilizada esté correctamente instalada/configurada en el contenedor backend (`backend/Dockerfile`), ya que herramientas de compresión de PDF suelen depender de binarios externos (p. ej. Ghostscript) que podrían faltar en la imagen.
* Flujo completo desde el frontend (`CompressPDF.jsx`) hasta la respuesta.

Agregar mensajes de error más descriptivos, y logs en backend para poder diagnosticar futuros fallos.

## Causa raíz real y resolución aplicada (2026-07-05)

**No era una librería externa faltante** (no se usa Ghostscript, solo `pypdf` puro Python). Se encontraron y reprodujeron dos bugs reales en `compress_pdf.py`:

1. **Bug principal (afectaba a TODOS los PDFs)**: el código llamaba `page.compress_content_streams()` antes de agregar la página al `PdfWriter`. Con `pypdf==6.14.2` esto requiere que la página ya pertenezca a un writer — fallaba con `ValueError: Page must be part of a PdfWriter` sin importar el contenido del archivo. Corregido invirtiendo el orden: agregar todas las páginas al writer primero, y comprimir después iterando `writer.pages`.
2. **Bug secundario**: un PDF protegido con contraseña revienta con `FileNotDecryptedError` al iterar `reader.pages`, excepción que quedaba fuera del único `try/except` existente (que solo cubría la lectura inicial). Ahora se captura específicamente y se informa: "Este PDF está protegido con contraseña. Quítale la protección (herramienta 'Desbloquear PDF') antes de comprimirlo."

Verificado con `curl` y navegador real: PDF de texto normal (antes 500, ahora 200), PDF con imágenes ~6.4MB (antes 500, ahora 200), PDF cifrado (antes 500, ahora 400 con mensaje claro), archivo corrupto (400, sin cambios). Detalle completo, incluyendo una limitación conocida (la compresión no recodifica imágenes embebidas, así que en PDFs dominados por imágenes la reducción es mínima), en `changes/PRUEBAS_COMPRIMIR_PDF.md`.

---

# 6. Unir PDFs (RESUELTO)

Backend: `backend/pdf_tools_app/services/merge_pdf.py` (función `merge_pdfs`), endpoint `POST /api/pdf/merge/`.
Frontend: `frontend/src/pages/PDFTools/` (herramienta de unir PDFs).

## Problema

En consola: `POST /api/pdf/merge/` → HTTP 413 (Request Entity Too Large)

Mensaje mostrado:

> Ocurrió un error al procesar los archivos.

## Objetivo

Este es el mismo problema estructural documentado en la sección 3 (sin límites de tamaño configurados en Django, Nginx ni gunicorn), agravado aquí porque **Unir PDFs implica subir varios archivos a la vez**, lo que hace más fácil superar el límite default.

Verificar:

* Que la corrección de límites aplicada en la sección 3 (`settings.py`, `nginx.conf`) cubra también el caso de múltiples archivos simultáneos.
* Manejo de múltiples archivos en `merge_pdf.py` y en la vista correspondiente.
* Validaciones de tamaño total (suma de todos los archivos) tanto en frontend como backend.

Realizar pruebas con archivos pequeños, medianos y grandes, y con distintas cantidades de archivos.

## Resolución aplicada (2026-07-05)

Mismo fix que la sección 3 (`MAX_UPLOAD_SIZE_MB=150` en `settings.py`, `client_max_body_size 150M` en `nginx.conf`, `--timeout` en gunicorn). No se necesitó validación de tamaño total adicional en `merge_pdf.py`: `pdf_tools_app/serializers.py` ya validaba tamaño por archivo (25MB) y cantidad de archivos (30 máx.) antes de esta sesión; el límite de infraestructura de 150MB se eligió específicamente para dar margen a varios archivos de ese tamaño combinados.

Verificado con `curl`: unir 2 PDFs reales de ~10MB cada uno (~20MB total) — antes fallaba con 413, ahora responde 200 con el PDF combinado correcto. Detalle en `changes/PRUEBAS_LIMITES_PDF.md`.

---

# 7. Mejoras del Generador de Código QR (RESUELTO)

Componente: `frontend/src/pages/QR/QR.jsx`. Endpoint: `POST /qr/codigos/generar/`.

## Estado actual

El QR **se genera en el backend**, no en el frontend (la librería `qrcode.react` está en `package.json` pero no se usa en `QR.jsx`); el frontend recibe el resultado como `png_base64`. Ya existe cierta personalización básica en el formulario (`color_fg`, `color_bg`, `forma`) y pestañas de "Generar / Mis QRs / Galería".

## Objetivo

Ampliar la personalización existente, evaluando si conviene mantener la generación en backend o migrar a un editor visual en tiempo real en el frontend (lo cual cambiaría la arquitectura actual, así que debe evaluarse con cuidado antes de implementar).

Lo que falta hoy y se desea agregar:

* Personalizar la forma de los módulos (cuadrados, círculos, puntos, rombos, etc.) — actualmente solo existe un campo genérico `forma`, verificar qué tan configurable es en backend.
* Cambiar la forma de los ojos del QR.
* Aplicar gradientes (hoy solo hay color plano `color_fg`/`color_bg`).
* Agregar un logotipo al centro (no existe soporte actualmente).
* Ajustar márgenes.
* Descargar el resultado en PNG, SVG y PDF (hoy solo se maneja `png_base64`).
* Mantener la legibilidad del código QR en todas las combinaciones.

## Investigar las mejores alternativas

Antes de implementar, investigar librerías compatibles con React (por ejemplo **qr-code-styling**, que sí soporta formas de ojos, gradientes y logo, u otras alternativas) y decidir si la generación/personalización debe hacerse en el frontend (editor tipo Canvas en tiempo real) o si se extiende el servicio backend actual. Seleccionar la opción que mejor se adapte a la arquitectura ya existente (generación server-side).

## Decisión y resolución aplicada (2026-07-05)

**No hizo falta ninguna librería JS nueva.** La librería `qrcode` (Python, ya era dependencia del proyecto) resultó tener soporte nativo para módulos con forma (`module_drawer`), **ojos con forma independiente de los módulos** (`eye_drawer` — no documentado a simple vista, confirmado leyendo el código fuente), degradados (`color_mask`) y logo embebido (`embedded_image`). Se decidió mantener la generación 100% server-side (respeta la arquitectura existente: galería, email, contador de descargas dependen de tener el QR ya generado en el backend).

Implementado: `qr_app/services/qr_render.py` (nuevo) con `render_qr_png` (estilo completo), `render_qr_svg` (vectorial, color sólido — sin degradado/ojos/logo, ver limitación) y `render_qr_pdf` (envuelve el PNG en un PDF de una página vía `weasyprint`, ya dependencia del proyecto). Modelo `CodigoQR` ampliado con `forma_ojos`, `gradiente_tipo`, `color_gradiente`, `margen` (el campo `logo` ya existía pero nunca se usaba). Nueva acción `POST /qr/codigos/descargar/` para bajar un QR sin guardar en el formato elegido; `descarga` de un QR guardado ahora soporta `?formato=png|svg|pdf`. Frontend (`QR.jsx`) ampliado con todos los controles nuevos y subida de logo vía `FormData` (mismo patrón que `Organizacion.jsx`).

Verificado que el QR sigue siendo **escaneable** (decodificado con `cv2.QRCodeDetector`) incluso con módulos/ojos personalizados y logo embebido (nivel de corrección de errores H cuando hay logo). Probado extensamente con `curl` y navegador real — sin errores. Detalle completo, incluyendo las limitaciones documentadas (SVG sin degradado/logo/ojos; sin editor Canvas en tiempo real, se mantuvo el patrón de botón "Generar Preview" explícito), en `changes/PRUEBAS_QR_AVANZADO.md`.

---

# 8. Link para invitar usuarios (RESUELTO)

Frontend: `frontend/src/pages/Usuarios/Usuarios.jsx`. Backend: `InvitacionViewSet` en `backend/cotizador_project/views.py`.

## Estado actual

La funcionalidad **ya está implementada**: botón "Invitar usuario", lista de "Invitaciones pendientes", función `copiarLink` que usa `navigator.clipboard.writeText(link)` sobre `buildInviteLink(invitacion.token)`, y feedback visual "¡Copiado!". También existe `cancelarInvitacion` y, en backend, la acción `cancelar` y `_enviar_email_invitacion`.

## Problema

Pese a que la implementación con `navigator.clipboard` existe, se reporta que el botón **"Copiar enlace" no funciona correctamente en algunos casos**. Causas típicas a descartar en este código concreto:

* `navigator.clipboard` requiere contexto seguro (HTTPS) o `localhost`; si el sitio se sirve por HTTP en algún entorno, la API falla silenciosamente o lanza una excepción no capturada.
* Falta de manejo de la promesa rechazada de `writeText` (verificar si `copiarLink` tiene `try/catch` o `.catch`).
* `buildInviteLink` podría estar generando una URL incorrecta en ciertos entornos (dominio/puerto).

## Objetivo

Corregir el funcionamiento real del botón **Copiar enlace** en `copiarLink` (`Usuarios.jsx`).

### Validar

* Que el enlace se copie correctamente al portapapeles en todos los navegadores/entornos soportados (incluyendo fallback si `navigator.clipboard` no está disponible).
* Que la notificación "¡Copiado!" se muestre siempre que la copia sea exitosa.
* Mostrar un mensaje de error claro si `writeText` falla.
* Verificar que `buildInviteLink` genere la URL correcta en desarrollo y producción.

## Causa raíz real y resolución aplicada (2026-07-05)

**Confirmado exactamente el primer punto de la lista de sospechas.** La `.env` real de producción usa `FRONTEND_URL=http://192.168.1.101:8080` — HTTP plano sobre IP de LAN, que **no** es un contexto seguro. `navigator.clipboard` no falla silenciosamente ahí: directamente **no existe** (`undefined`), por lo que `copiarLink` fallaba de forma consistente en producción, no "en algunos casos".

Se agregó `copiarAlPortapapeles()` en `Usuarios.jsx` con fallback: usa `navigator.clipboard` cuando está disponible en contexto seguro, y si no, recurre al mecanismo clásico (`<textarea>` oculto + `document.execCommand('copy')`, que no requiere contexto seguro). Si ambos fallan, se muestra un mensaje de error con el link completo para copiarlo manualmente.

Verificado con navegador real en 3 escenarios: contexto seguro (funciona igual que antes, verificado leyendo el portapapeles), contexto no seguro simulado como el de producción (el fallback funciona y muestra "¡Copiado!"), y fallo total de ambos mecanismos (mensaje de error con el link visible). `buildInviteLink` ya generaba la URL correcta (`${window.location.origin}/invitaciones/aceptar/${token}`, que coincide con la ruta real registrada en `App.jsx`) — no necesitó cambios. Detalle completo en `changes/PRUEBAS_COPIAR_LINK_INVITACION.md`.

---

# 9. Mejora de Cotizaciones

Frontend: `frontend/src/pages/Cotizaciones/` (`Cotizaciones.jsx`, `CotizacionForm.jsx`). Backend: `CotizacionViewSet` en `backend/cotizador_project/views.py`, que actualmente solo expone las acciones `cambiar_estado`, `pdf` y `compartir_email`.

## Problema

No existe ninguna acción de duplicar/clonar cotización, ni en backend ni en frontend. Cuando un cliente solicita una cotización muy similar a otra existente, actualmente es necesario crearla nuevamente desde cero.

## Objetivo

Agregar una nueva acción `duplicar` en `CotizacionViewSet` (siguiendo el mismo patrón que `cambiar_estado`/`pdf`/`compartir_email`) y su correspondiente botón/flujo en `Cotizaciones.jsx` o `CotizacionForm.jsx`.

### Requerimientos

La nueva cotización deberá:

* Copiar toda la información de la cotización original (usar los serializers existentes en `backend/cotizador_project/serializers.py` como base).
* Generar un nuevo identificador.
* Mantener el estado inicial correspondiente (no copiar el estado final de la original, p. ej. "Aceptada").
* Permitir modificar cualquier dato antes de guardarla (abrir en `CotizacionForm.jsx` prellenado, sin guardar automáticamente).
* Copiar todos los servicios asociados y sus atributos.
* Copiar precios, cantidades, observaciones y cualquier otra información relacionada.
* No modificar la cotización original bajo ninguna circunstancia (la duplicación debe ser una operación de solo lectura sobre el original).

---

# 10. Servicios — no se puede guardar un nuevo valor de atributo (RESUELTO)

Frontend: `frontend/src/pages/Servicios/ServicioForm.jsx`.

## Problema (reportado 2026-07-04)

Al editar un servicio existente y agregar un atributo nuevo a su categoría (p. ej. tipo "Texto"), el campo para escribir el valor aparecía correctamente en "Valores para {categoría}", pero al escribir el texto el botón **Guardar** permanecía deshabilitado — no daba la opción de guardar el cambio.

## Causa raíz

`isDirty` (que controla el `disabled` del botón Guardar en modo edición) solo comparaba el estado `form` (nombre/categoría/precio/descripción) contra `initialForm`. El valor de los atributos vive en un estado separado, `valoresForm`, que nunca se incluía en esa comparación. Resultado: si el usuario solo tocaba el valor de un atributo (sin modificar ningún otro campo del servicio), `isDirty` seguía en `false` y el botón quedaba deshabilitado indefinidamente.

## Resolución aplicada

Se agregó `initialValoresForm` (capturado al cargar el servicio, igual que `initialForm`) y se amplió `isDirty` para comparar también `valoresForm` contra `initialValoresForm`. Ahora escribir/cambiar el valor de cualquier atributo habilita correctamente el botón Guardar.

## Verificación (pruebas de flujo completo)

Reproducido y verificado en un entorno local aislado (SQLite, no producción) con navegador real (Chromium vía Playwright):
1. Editar un servicio existente → agregar atributo nuevo tipo "Texto" a su categoría → el atributo se crea y aparece en "Valores para {categoría}" (esto ya funcionaba).
2. Escribir un valor en el campo del atributo nuevo → antes del fix, el botón Guardar quedaba deshabilitado; **tras el fix, se habilita correctamente**.
3. Guardar → navega al listado sin errores.
4. Reabrir el mismo servicio → el valor escrito persiste (confirmado tanto visualmente como vía `GET /api/servicios/{id}/`, que devuelve el `valor` guardado en `valores`).
5. Sin errores en la consola del navegador durante todo el flujo.

Detalle completo en `changes/PRUEBAS_ATRIBUTOS_SERVICIO.md`.

---

# Requisitos Generales

Durante toda la implementación:

* Mantener la arquitectura actual del proyecto.
* No romper funcionalidades existentes.
* Reutilizar componentes cuando sea posible (por ejemplo, `recharts` para las gráficas de Finanzas, ya usado en Dashboard y Fibras).
* Mantener buenas prácticas de desarrollo.
* Mejorar la experiencia de usuario (UX).
* Mejorar los mensajes de error para que sean claros y útiles.
* Validar correctamente todos los formularios.
* Manejar adecuadamente las excepciones tanto en frontend como en backend.
* Optimizar el rendimiento cuando sea posible.
* Documentar cualquier cambio importante realizado.
* Realizar pruebas completas antes de dar por finalizada cada tarea.

---

# Criterios de Aceptación

Cada mejora se considerará terminada únicamente si cumple con los siguientes criterios:

* No existen errores en la consola del navegador.
* No existen errores en el backend relacionados con la funcionalidad implementada.
* No se rompió ninguna funcionalidad existente.
* La experiencia de usuario mejoró respecto a la versión anterior.
* Todos los flujos fueron probados manualmente.
* Los mensajes de error son claros y comprensibles.
* El código mantiene la estructura y estándares del proyecto.
* Todas las funcionalidades implementadas son estables y listas para producción.
