# Pruebas de Flujo Completo — UX de fechas en Simulación de FIBRAS (sección 2 de `ListUpdata.MD`)

Fecha: 2026-07-05
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177`. Pruebas de UI con navegador real (Chromium) automatizado con Playwright, mismo enfoque que en `PRUEBAS_DUPLICAR_COTIZACION.md` y `PRUEBAS_ATRIBUTOS_SERVICIO.md`.

## Problema original

En `SimulacionForm.jsx`, los campos "Fecha de inicio" y "Fecha de fin" eran simples `<input type="date">` sin ningún texto de ayuda, tooltip ni validación de rango visible, dejando al usuario sin contexto sobre qué representaba cada fecha en el cálculo de la simulación (¿periodo histórico? ¿de inversión? ¿de consulta?).

## Cambios aplicados

En `frontend/src/pages/Fibras/SimulacionForm.jsx`:
- Párrafo explicativo al inicio del formulario: aclara que es un backtest histórico.
- `hint` + `title` (tooltip nativo) en ambos campos de fecha.
- Resumen dinámico del período simulado, actualizado en tiempo real.
- Validación de rango (`fecha_fin` debe ser posterior a `fecha_inicio`, no futura), tanto inline como al enviar.
- Atributos `min`/`max` nativos en los inputs de fecha.

En `frontend/src/components/ui/Input.jsx` y `Input.module.css`: se agregó soporte de `hint` al componente `Field` (reutilizable en toda la app, no rompe usos existentes ya que es un prop opcional).

## Entorno de prueba

Aislado, no productivo:
- `backend/.env` copiado del `.env` de la raíz (ignorado por git), sin `DATABASE_URL` → cae a SQLite local.
- Catálogo de FIBRAs ya viene seed-eado por la migración `fibras_app.0002_seed_fibras` (8 tickers).
- Se generaron datos sintéticos de `PrecioHistorico` (6 años, días hábiles, random walk) y `DividendoHistorico` (pago mensual) para el ticker `FUNO11.MX`, para poder ejecutar una simulación real de punta a punta.
- Usuario de prueba `tester1` (rol admin, con todos los flags de permiso).

## Pruebas realizadas (navegador real, Chromium vía Playwright)

| Caso | Resultado |
|---|---|
| Carga inicial del formulario | Texto explicativo del backtest, hints bajo ambos campos de fecha y resumen dinámico visibles desde el primer render |
| Cambio de fechas (rango válido) | El resumen ("Se simulará una inversión desde… hasta…") se recalcula correctamente, incluyendo la duración en años/meses |
| Caso límite: `fecha_fin` anterior a `fecha_inicio` | Mensaje de error inline en rojo bajo el campo ("Debe ser posterior a la fecha de inicio") + botón "Simular" deshabilitado |
| Caso límite: `fecha_fin` igual a `fecha_inicio` | Mismo comportamiento — rechazado correctamente |
| Tooltips nativos | Atributo `title` presente y con el texto esperado en ambos campos de fecha |
| Simulación completa (FUNO11.MX, 5 años, con reinversión de dividendos) | Resultado calculado correctamente: valor final, retorno total/anualizado, gráfica de crecimiento del capital y gráfica de proyección de dividendos, todo renderizado sin errores |
| Consola del navegador | Sin errores en ningún paso del flujo |

## Limpieza

Procesos de prueba (`manage.py runserver`, `npm run dev`) corridos contra `backend/db.sqlite3` local; no se tocó el Postgres de producción. `backend/.env` y `backend/db.sqlite3` (ambos ignorados por git) eliminados al finalizar.
