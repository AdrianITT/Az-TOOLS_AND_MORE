# Nuevo Módulo: Herramientas PDF

## Contexto y Objetivo

Agregar un módulo independiente **Herramientas PDF** que centralice utilidades de conversión y manipulación de archivos PDF. La arquitectura debe permitir agregar nuevas herramientas sin modificar las existentes (patrón de plugins/servicios), con un diseño intuitivo, moderno y reutilizable.

Stack: Backend Django + DRF, Frontend React.

## Herramientas Iniciales

### 1. Imágenes → PDF
- Seleccionar de 1 a N imágenes (JPG, JPEG, PNG, WEBP opcional).
- Reordenar, previsualizar y eliminar imágenes antes de generar.
- Mantener la resolución original cuando sea posible.
- Generar un único PDF descargable.

### 2. Unir PDFs
- Seleccionar de 2 a N archivos PDF.
- Reordenar y eliminar documentos antes de procesar.
- Generar un único PDF final.

### 3. Word → PDF
- Aceptar `.doc` y `.docx`, de 1 a N documentos.
- Reordenar antes de convertir.
- Unir todos los documentos en un solo PDF respetando el orden y manteniendo el formato lo mejor posible.

## Flujo UX (común a las 3 herramientas)

1. Seleccionar archivos (drag & drop + selector).
2. Mostrar lista de archivos con opciones: reordenar, eliminar, agregar más.
3. Botón principal contextual ("Generar PDF" / "Unir PDF" / "Convertir").
4. Indicador de progreso durante el procesamiento.
5. Al finalizar: mensaje de éxito + descarga del archivo generado.

## Validaciones (frontend y backend)

- Tipo de archivo inválido, archivo corrupto o vacío.
- Tamaño máximo por archivo y número máximo de archivos (ambos configurables).
- Errores de conversión, con mensajes claros para el usuario.

## Backend (Django + DRF)

Un endpoint independiente por herramienta:
- `POST /api/pdf/images-to-pdf/`
- `POST /api/pdf/merge/`
- `POST /api/pdf/word-to-pdf/`

Lineamientos:
- Serializers para validar archivos de entrada.
- Lógica de negocio en servicios, no en las vistas.
- Estructura pensada para agregar nuevas herramientas sin tocar las existentes.

## Frontend (React)

Módulo independiente `PDFTools/` con subcarpetas por herramienta (`ImagesToPDF/`, `MergePDF/`, `WordToPDF/`) más `components/`, `hooks/`, `services/`, `pages/` compartidos.

Componentes comunes reutilizables (evitar duplicar lógica):
- DropZone
- Lista de archivos (reordenable)
- Barra de progreso
- Botones de acción
- Modal de errores
- Vista previa

## Roadmap de Escalabilidad (futuras herramientas)

PDF → Imágenes, PDF → Word, PDF → Excel, PDF → PowerPoint, PDF → Texto, OCR, comprimir, dividir, eliminar/rotar/reordenar páginas, marca de agua, numeración, firmar, proteger/desbloquear con contraseña, extraer imágenes/texto, PDF → PDF/A.

## Requisitos de Código

- Código limpio, mantenible, principios SOLID.
- Componentes reutilizables; separación clara entre presentación, lógica y acceso a datos.
- Manejo centralizado de errores.
- Tipado (TypeScript) si el proyecto lo usa.
- Preparado para pruebas unitarias.

## Mejoras a Futuro (nice-to-have, proyecto personal)

- Procesamiento asíncrono para archivos grandes (no bloquear la UI).
- Persistencia temporal de la lista de archivos ante recarga de página.
- Historial de conversiones (fecha, tipo, re-descarga si el archivo aún existe).
- Configuración de salida: tamaño de página (A4/Carta/Oficio), orientación, márgenes, calidad de imagen, compresión.
- Nombres personalizados para archivos generados.

## Estado de implementación

**Completado (2026-07-03):**

Backend (`backend/pdf_tools_app/`):
- App independiente con patrón de servicios (`services/images_to_pdf.py`, `merge_pdf.py`, `word_to_pdf.py`), sin lógica de negocio en las vistas.
- 3 endpoints funcionando: `POST /api/pdf/images-to-pdf/`, `/api/pdf/merge/`, `/api/pdf/word-to-pdf/`, vía `BasePdfToolView` compartida.
- Serializers con validación de tipo, tamaño (25MB/archivo) y cantidad (máx. 30 archivos, configurable en `serializers.py`).
- Merge con `pypdf`; imágenes→PDF con `Pillow`; Word→PDF con `mammoth` (docx→HTML) + `weasyprint` (HTML→PDF, ya usado en el proyecto).
- Verificado con curl: los 3 endpoints devuelven PDFs válidos; errores de validación devuelven mensajes claros.
- **Limitación conocida:** `.doc` (formato legado) se rechaza explícitamente con mensaje pidiendo `.docx`, porque no hay LibreOffice/MS Word disponible en el entorno para convertirlo. Solo `.docx` está soportado end-to-end.

Frontend (`frontend/src/pages/PDFTools/`):
- Módulo con subcarpetas por herramienta (`ImagesToPDF/`, `MergePDF/`, `WordToPDF/`) + `components/`, `hooks/`, `services/` compartidos.
- Componentes reutilizables: `DropZone`, `FileList` (reordenable con botones arriba/abajo, no drag-and-drop de lista), `ProgressBar`, `PdfToolPage` (template que orquesta el flujo UX completo).
- Hook `usePdfFiles` para manejar estado de archivos (agregar/quitar/mover) y limpieza de previews.
- Servicio `pdfToolsApi.js` con `XMLHttpRequest` (no el cliente `api` JSON existente) para soportar `FormData`, respuesta binaria y progreso de subida real.
- Página hub `/pdf-tools` con las 3 tarjetas de acceso; rutas y entrada de sidebar ("Herramientas PDF") registradas.
- `npm run build` pasa sin errores.

**Completado (2026-07-03, sesión 2):**
- Modal de errores: `PDFTools/components/ErrorModal.jsx` reutiliza `components/ui/Modal.jsx`; `PdfToolPage` ya no muestra el error como texto inline, lo abre en modal ("No se pudo procesar" + botón "Entendido").
- Vista previa ampliada de imágenes: `PDFTools/components/ImagePreviewModal.jsx` (lightbox propio, portal a `document.body`, fondo oscuro, clic fuera o botón X para cerrar). En `FileList.jsx`, el thumbnail ahora es un botón clickeable que abre el lightbox con la imagen a tamaño grande y el nombre del archivo; solo aplica a items con `previewUrl` (imágenes en Imágenes→PDF).

**Completado (2026-07-03, sesión 3 — roadmap de escalabilidad):**

Backend, 3 herramientas nuevas + nombres de salida personalizados:
- `services/split_pdf.py` — `POST /api/pdf/split/`: divide un PDF en varios (`ranges` opcional tipo "1-3,4-6"; vacío = un archivo por página). Devuelve `.zip`. Usa `pypdf`.
- `services/edit_pages.py` — `POST /api/pdf/edit-pages/inspect/` devuelve miniaturas PNG (base64) por página; `POST /api/pdf/edit-pages/` recibe `operations` (JSON: `[{page, rotate}]`, el orden de la lista define el orden final, páginas omitidas = eliminadas) y devuelve el PDF editado. Usa `pymupdf` (miniaturas) + `pypdf` (reconstrucción/rotación).
- `services/pdf_to_images.py` — `POST /api/pdf/pdf-to-images/`: rasteriza cada página a PNG/JPG (150 DPI) y devuelve `.zip`. Usa `pymupdf`, sin dependencia de binarios externos (no requiere poppler/LibreOffice).
- Nueva dependencia: `pymupdf==1.28.0` (wheel puro, sin binarios del sistema) — agregada a `requirements.txt`.
- `output_name` (opcional) agregado a **todos** los serializers (los 3 tools originales + los 3 nuevos): sanitiza el nombre dado por el usuario y arma el `Content-Disposition` con la extensión correcta (`.pdf` o `.zip` según la herramienta).
- Verificado con curl: split (ambos modos), pdf-to-images, inspect (miniaturas) y edit-pages (reordenar + eliminar + rotar) devuelven resultados correctos; nombre de archivo personalizado confirmado en el header de respuesta.

Frontend, 3 páginas nuevas + input de nombre de salida:
- `pdfToolsApi.js` generalizado: `uploadFormForPdf`/`uploadFormForJson` (FormData genérico, no solo `files[]`) y ahora resuelven `{blob, filename}` leyendo el nombre real desde `Content-Disposition` (con fallback). `uploadFilesForPdf` se mantiene como wrapper de compatibilidad para las 3 herramientas originales.
- `PdfToolPage.jsx` (template compartido) ganó: input "Nombre del archivo (opcional)", soporte `singleFile` (un solo archivo, usado por Split/PDF→Imágenes/Editar) y `extraFields` (inputs/selects declarativos por herramienta, p.ej. "Rangos de páginas" o "Formato de imagen").
- `SplitPDF/SplitPDF.jsx` y `PdfToImages/PdfToImages.jsx` — reutilizan `PdfToolPage` con `singleFile` + `extraFields`.
- `EditPages/EditPages.jsx` — página propia (no usa el template genérico porque el flujo es distinto: subir → inspeccionar → editar grid de páginas → generar). Grid de miniaturas con botones para mover (`←`/`→`), rotar (acumulativo, se refleja visualmente con `transform: rotate()`) y eliminar cada página; input de nombre de salida; llama a `/edit-pages/inspect/` y luego `/edit-pages/`.
- Hub `/pdf-tools` y rutas (`/pdf-tools/dividir-pdf`, `/pdf-tools/pdf-a-imagenes`, `/pdf-tools/editar-paginas`) actualizados con las 3 tarjetas nuevas.
- `npm run build` y `npm run lint` pasan sin errores nuevos (solo warnings preexistentes en `QR.jsx` y `usePdfFiles.js`, no relacionados con esta sesión).

**Pendiente / no implementado:**
- Soporte real para `.doc` legado (Word→PDF).
- Mantener resolución original de imágenes en Imágenes→PDF: no se verificó explícitamente con imágenes de alta resolución.
- Resto del roadmap: PDF→Word, PDF→Excel, PDF→PowerPoint, PDF→Texto, OCR, comprimir, marca de agua, numeración, firmar, proteger/desbloquear con contraseña, extraer imágenes/texto, PDF→PDF/A.
- Mejoras "nice-to-have" restantes: procesamiento asíncrono para archivos grandes, persistencia de la lista ante recarga, historial de conversiones, configuración de salida (tamaño de página, orientación, márgenes, calidad/compresión), TypeScript.
- `EditPages` no tiene drag-and-drop de miniaturas (usa botones ←/→ como el resto del módulo) ni deshacer tras eliminar una página.
