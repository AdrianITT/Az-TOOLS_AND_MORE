# Módulo de Organización (Configuración de la Empresa)

## Contexto del proyecto

- Backend: Django + Django REST Framework. Cada dominio vive en su propia app (`cotizador_project`, `finanzas_app`, `pdf_tools_app`, `qr_app`, `fibras_app`). El módulo de Organización debe seguir el mismo patrón: modelo, serializer, vista/endpoint y `urls.py` propios (app existente `cotizador_project` u otra app dedicada, según se decida).
- Frontend: React + Vite. Ya existe `frontend/src/pages/Organizacion/Organizacion.jsx` y `Organizacion.module.css` con una primera versión funcional (carga/edición de datos, subida de logo, campo `color_primario`). Este prompt describe el estado objetivo/completo del módulo; al implementarlo, **extender lo existente en vez de reescribirlo desde cero**.
- Componentes UI reutilizables ya disponibles: `components/ui/Card`, `components/ui/Button`, `components/ui/Input` (con `Field`), `pages/PageHeader`, y estilos de formulario compartidos en `pages/shared-form.module.css`. Reutilizar estos antes de crear componentes nuevos.
- Cliente HTTP: usar `api` de `src/api/client.js` (incluye manejo de token y errores vía `getErrorMessage`) en vez de `fetch` directo, salvo que se necesite `FormData` (como ya ocurre para el logo).
- El endpoint actual es singleton implícito: `GET/PATCH /api/organizacion/`. Mantener ese contrato.

## Objetivo

Convertir "Organización" en la fuente única de verdad para los datos de la empresa: identidad, contacto, dirección, redes sociales, logo **y paleta de colores de marca**. Todo el sistema (cotizaciones, PDFs, reportes, y la propia interfaz de la app) debe consumir estos datos desde este único origen, sin duplicar información.

## Información a administrar

### Información general
- Nombre de la empresa
- Nombre comercial
- Logo
- RFC (opcional)
- Giro de la empresa
- Descripción

### Datos de contacto
- Correo electrónico
- Teléfono
- WhatsApp
- Sitio web

### Dirección
- Calle, número, colonia, ciudad, estado, país, código postal

### Redes sociales (opcionales)
- Facebook, Instagram, X (Twitter), LinkedIn

### Logo de la empresa
- Subir, cambiar, eliminar imagen
- Vista previa inmediata (drag & drop deseable)
- Validar formato (PNG, JPG, WEBP) y tamaño máximo
- Se usa automáticamente en cotizaciones, PDFs, reportes y vistas previas de documentos

### Paleta de colores de marca (tema visual de la app)

Agregar un panel de **"Apariencia"** dentro del módulo de Organización donde el usuario defina la paleta de colores de la aplicación completa (no solo del PDF). El usuario solo elige colores base; el resto de tonos derivados (hover, texto sobre color, bordes, etc.) se calculan automáticamente para mantener contraste y legibilidad.

Colores configurables (mínimo, alineados a `frontend/src/styles/variables.css`):
- Color primario (marca) → reemplaza `--color-primary`
- Color de fondo general → reemplaza `--color-bg`
- Color de superficie/tarjetas → reemplaza `--color-surface`
- Color de texto principal → reemplaza `--color-text`
- Color de menú/sidebar (fondo y texto), si se decide independizarlo del resto

Requisitos:
- Selector de color (input `type="color"` o color picker) con vista previa en vivo de cómo se ve el sidebar, header y una tarjeta antes de guardar.
- Al guardar, los colores se persisten en el modelo `Organization` y se aplican globalmente sobreescribiendo las CSS custom properties en `:root` (por ejemplo inyectando un `<style>` o seteando `documentElement.style.setProperty` al cargar la app), sin tocar el archivo `variables.css` original (ese sigue siendo el fallback/default).
- Botón "Restablecer colores por defecto" que vuelve a los valores de `variables.css`.
- Validar que los colores sean hex válidos tanto en frontend como en backend.
- Los colores de marca (`color_primario` al menos) también deben reutilizarse en el PDF de cotizaciones generado por `pdf.py`.

## UX/UI

- Diseñar una interfaz limpia, organizada en tarjetas o pestañas: Información general, Contacto, Dirección, Redes sociales, Imagen corporativa, Apariencia (colores).
- Reutilizar `Card`, `Button`, `Field`/`Input` y `shared-form.module.css` para mantener consistencia visual con el resto del proyecto.
- Agregar: botón Guardar, botón Cancelar cambios, indicador de cambios sin guardar, mensajes de éxito/error, estados de carga (ya existe una base de esto en `Organizacion.jsx`, reforzarla).

## Backend

Extender el modelo/serializer/vista existentes de Organización (singleton) con Django + DRF:

Operaciones:
- Obtener información de la organización
- Actualizar información (incluye campos de contacto, dirección, redes sociales)
- Subir / cambiar / eliminar logo
- Actualizar paleta de colores

Validaciones:
- Solo debe existir una organización (singleton).
- Validar formato y tamaño máximo del logo.
- Validar campos obligatorios.
- Validar que los campos de color sean códigos hexadecimales válidos.

### Modelo sugerido (extender el actual, que ya usa nombres en español: `nombre`, `email`, `telefono`, `sitio_web`, `direccion`, `ciudad`, `pais`, `color_primario`, `logo`)

```
Organization
  id
  nombre
  nombre_comercial
  descripcion
  rfc
  giro
  email
  telefono
  whatsapp
  sitio_web

  calle
  numero_exterior
  colonia
  ciudad
  estado
  pais
  codigo_postal

  facebook
  instagram
  twitter
  linkedin

  logo

  color_primario
  color_fondo
  color_superficie
  color_texto
  color_menu_fondo
  color_menu_texto

  created_at
  updated_at
```

## Consideraciones

- Toda la información debe ser reutilizable desde cualquier módulo (cotizaciones, PDFs, reportes futuros).
- No duplicar datos de empresa en cotizaciones, clientes o PDFs; siempre obtener la información desde Organización.
- Preparar el modelo para futuras funcionalidades: facturación, firma digital, sellos, múltiples sucursales, temas corporativos adicionales.

## Frontend (React)

- Extender la página de Organización existente (`Organizacion.jsx`) en vez de crear una nueva.
- Usar componentes UI reutilizables ya existentes (`Card`, `Button`, `Field`, `Input`).
- Validaciones de formulario y manejo de errores del servidor vía `getErrorMessage`.
- Carga del logo con drag & drop y vista previa.
- Nuevo panel de Apariencia con selectores de color y vista previa en vivo.
- Aplicar los colores guardados globalmente al cargar la app (por ejemplo desde `App.jsx`, seteando las CSS custom properties de `variables.css` en tiempo de ejecución).
- Indicadores de carga y estados de guardado.

## Objetivo final

Un módulo de Configuración de la Organización completamente funcional, escalable y reutilizable, que centralice toda la información corporativa —incluida la identidad visual/paleta de colores de la app— para que cualquier parte del sistema (cotizaciones, PDFs, reportes, interfaz general y futuras funcionalidades) consuma estos datos desde un único origen, evitando duplicidad de información y facilitando el mantenimiento del proyecto.
