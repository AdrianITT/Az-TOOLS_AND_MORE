# FIBRAs — Simulación de Inversiones (Finanzas)

**Fecha:** 2026-07-02
**Fase:** Nuevo apartado en Finanzas
**Estado:** ✅ Backend + Frontend implementados y verificados · ⚠️ Pendientes operativos abajo

## Resumen

Apartado de simulación de inversiones en FIBRAs mexicanas dentro de Finanzas: catálogo de FIBRAs (BMV), histórico de precios/dividendos vía Yahoo Finance, motor de simulación propio (lump sum, reinversión DRIP, aportaciones periódicas DCA, comparación entre FIBRAs) e historial de simulaciones guardadas por organización.

- Backend: `backend/fibras_app/` (app Django nueva, ver `.claude/commands/NewSectionForFinance.md` para el pedido original y las decisiones tomadas).
- Frontend: `frontend/src/pages/Fibras/` + ítem de nav "FIBRAs" bajo el grupo Finanzas.
- Commit: `01e8d10` ("Add FIBRAs investment simulation section to Finanzas").

Verificado en esta sesión: 10/10 tests de `fibras_app`, sincronización real contra Yahoo Finance (7/8 tickers con datos reales), modo comparación probado visualmente, `npm run build` compila limpio.

## Pendientes

### 1. Programar `sync_fibras` en el servidor real (cron / launchd)

**Por qué falta:** el comando de sincronización (`backend/fibras_app/management/commands/sync_fibras.py`) existe y ya se probó manualmente, pero nadie lo dispara automáticamente. Sin esto, los precios/dividendos se van desactualizando (la UI ya marca esto con el badge "Desactualizado" en `FibrasCatalogo.jsx`, pero no se auto-corrige).

**Se dejó pendiente a propósito**: no se configuró en esta máquina porque no es donde va a correr en producción.

**Cómo hacerlo, cuando se defina el servidor:**
- Comando a programar: `cd backend && source venv/bin/activate && python manage.py sync_fibras`
- Horario sugerido: ~18:00 hora CDMX (2h después del cierre de BMV ~15:00), una vez al día, día hábil.
- Si el servidor es Linux (lo más probable en producción, a diferencia de este Mac de desarrollo): usar **crontab**, ej. `0 18 * * 1-5 cd /ruta/backend && venv/bin/python manage.py sync_fibras >> /var/log/fibras_sync.log 2>&1`.
- Si se despliega en macOS: usar **launchd** (`~/Library/LaunchAgents/*.plist` + `launchctl load`).
- No hay que tocar código para esto — es 100% configuración del servidor/infra donde se despliegue.
- Variables relevantes ya están en `backend/.env` (`FIBRAS_SYNC_SLEEP_SECONDS`, `FIBRAS_HISTORIAL_LOOKBACK_YEARS`, `FIBRAS_STALE_DATA_DAYS`) — no hace falta agregar nada nuevo, solo asegurarse de que el `.env` exista en el servidor de destino (está git-ignored, hay que crearlo ahí también).

### 2. Confirmar/reemplazar el ticker de Terrafina

**Estado actual:** `TERRA13.MX` está marcado `activo=False` en el catálogo (migración `backend/fibras_app/migrations/0003_desactivar_terra13.py`) porque Yahoo Finance ya no lo reconoce como listado BMV — solo aparece como `CBAOF` en OTC Pink Sheets (USD), que no es un reemplazo válido para este catálogo (mezclaría USD con el resto de tickers en MXN).

**Qué falta:** decidir si:
- (a) se deja desactivado permanentemente (el catálogo queda en 7 FIBRAs), o
- (b) se investiga si Terrafina fue absorbida por otra FIBRA tras una fusión y, de ser así, agregar el ticker de esa FIBRA sucesora al catálogo.

**Dónde:** si se opta por (b), agregar la nueva fila a `FIBRAS_SEED` en `backend/fibras_app/migrations/0002_seed_fibras.py` (o una migración nueva, siguiendo el patrón de `0003_desactivar_terra13.py`) y correr `python manage.py migrate fibras_app`.

### 3. Code-splitting del bundle de frontend (opcional, no bloqueante)

**Por qué:** `npm run build` compila bien, pero avisa que el bundle final pesa ~699 kB (gzip ~204 kB), principalmente por Recharts.

**Cómo, si se vuelve un problema real:** lazy-load las páginas de `frontend/src/pages/Fibras/` con `React.lazy()` + `Suspense` en `frontend/src/App.jsx` (patrón estándar de code-splitting por ruta con Vite/React Router), en vez de importarlas de forma estática como el resto de páginas hoy. No es necesario mientras el resto del proyecto tampoco haga code-splitting — sería inconsistente hacerlo solo acá sin revisar el resto de `App.jsx`.

### 4. Limitaciones conocidas del motor de simulación (documentadas, no son bugs)

Estas están explícitas en el código y en la UI, pero quedan anotadas acá por si en algún momento se decide invertir en mejorarlas:

- **CAGR aproximado, no XIRR real** (`backend/fibras_app/services/simulacion.py`, función `calcular_crecimiento`): cuando hay aportaciones periódicas (DCA), el retorno anualizado es una aproximación que no pondera el momento exacto de cada aportación. Para un cálculo exacto habría que implementar XIRR (búsqueda de la tasa que hace el VAN=0 de los flujos de caja fechados).
- **No contempla retenciones de ISR** sobre distribuciones de FIBRAs — el monto de dividendos simulado es bruto, no neto de impuestos.
- **Catálogo curado a mano**: no hay forma de descubrir automáticamente "todas las FIBRAs mexicanas" vía Yahoo Finance; agregar una nueva FIBRA al catálogo siempre va a requerir editar `FIBRAS_SEED` manualmente (ver punto 2 arriba para el patrón a seguir).

## Referencias

- Pedido original y decisiones de arquitectura: `.claude/commands/NewSectionForFinance.md`
- Plan de implementación completo (con lo ya resuelto marcado): `~/.claude/plans/rippling-jingling-pretzel.md`
