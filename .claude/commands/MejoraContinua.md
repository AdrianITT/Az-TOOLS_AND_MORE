# Análisis de Mejora Continua — Az-TOOLS_AND_MORE

> **Estado:** análisis entregado (2026-07-12). **Ola 1 completa (2026-07-13):** ✅ commit git, ✅ C2 respaldos (db-backup diario, restauración verificada; **pendiente segunda copia en USB/Drive**), ✅ C1 paginación real + totales del backend, ✅ C3 editar movimientos, ✅ T4 ordering.
>
> **Ola 2 completa (2026-07-13):** ✅ N1 cotización aceptada → ingreso (FK con anti-duplicado, botón en la franja de estado), ✅ N4 export CSV (ingresos/gastos/deudas/mensual, BOM para Excel), ✅ N2-mínimo botón Duplicar movimiento, ✅ N6 comprobante adjunto en captura manual, ✅ N3 badge rojo de vencimientos ≤7 días en el sidebar (refresco c/10 min). Pendientes de Ola 2: U2 Cloudflare Tunnel (requiere decisión de dominio), N2 completo (recurrentes automáticos), N3 por email (requiere proveedor). Pendiente: Ola 3.

Análisis del sistema completo con ojos de mejora continua: exactitud de datos, valor de negocio, experiencia de uso, y salud técnica. Ordenado por lo que más importa, no por lo más vistoso.

---

## 🔴 Hallazgos críticos — exactitud de datos (arreglar antes que cualquier feature)

### C1. Las listas solo muestran los primeros 20 registros — y los totales MIENTEN

**El hallazgo más importante de este análisis.** DRF pagina todo a `PAGE_SIZE=20`, y el frontend hace `data.results ?? data` en todas las listas — es decir, toma **solo la primera página y descarta el resto sin avisar**:

- La tabla de Gastos mostrará máximo 20 movimientos, sin botón "siguiente" ni indicio de que hay más.
- **"Total Ingresos" y "Total Gastos" se calculan sumando la lista visible** → al movimiento 21, los totales de las pestañas quedan **incorrectos silenciosamente**. Un usuario que concilie contra su cuenta bancaria verá números que no cuadran sin explicación.
- El checklist de "gastos que cubre este pago" (deudas) solo ofrece los primeros 20 gastos sin vincular.
- Las categorías se cortan en 20 (raro llegar, pero posible).

El Dashboard NO está afectado (usa agregados del backend), lo cual hace el bug más traicionero: dashboard y pestaña mostrarán totales distintos.

**Solución propuesta:** totales calculados en el backend (endpoint de agregado o campo extra en la respuesta), paginación real en las tablas (controles "‹ 1 2 3 ›" reutilizables) o `PAGE_SIZE` alto + paginación, y para el checklist de gastos un buscador. Es trabajo transversal (todas las páginas de lista: Finanzas, Clientes, Cotizaciones, Servicios, QR, Fibras).

### C2. Sin respaldos de la base de datos

La familia ya usa el sistema con datos reales; el volumen `postgres_data` vive en un solo disco de una sola máquina. Un fallo de disco = pérdida total.
**Solución:** servicio `db-backup` en compose (mismo patrón que `fibras-sync`): `pg_dump` diario comprimido a un directorio montado fuera del volumen Docker, retención de 14 días, y de preferencia copia a un segundo destino (USB montado o rclone a Drive). Media (comprobantes/logos) incluida vía tar del volumen. **Esfuerzo: bajo. Valor: enorme.**

### C3. Los movimientos no se pueden editar

Ingresos y Gastos solo tienen crear/borrar en la UI (el backend ya soporta PATCH). Un error de dedo obliga a borrar y recapturar — y con OCR registrando en ráfaga, los errores de captura serán más frecuentes. Las Deudas tampoco tienen edición en UI.
**Solución:** acción "Editar" por fila que reabre el formulario bajo demanda pre-llenado (los componentes ya existen).

---

## 🟠 Mejoras de alto valor de negocio

### N1. Cotización aceptada → Ingreso (cerrar el círculo cotizador ↔ finanzas)

La joya escondida del sistema: hoy el cotizador y Finanzas no se hablan. Cuando una cotización pasa a "aceptada", ofrecer **"Registrar como ingreso"** (monto = total, descripción = número + cliente, categoría a elegir). Trazabilidad opcional con FK `Ingreso.cotizacion`. Es el flujo real del negocio: cotizo → me aceptan → cobro → es un ingreso.

### N2. Movimientos recurrentes (renta, sueldos, suscripciones)

Los gastos fijos son la mitad de la contabilidad de un negocio pequeño y hoy exigen recaptura manual mensual. Modelo `MovimientoRecurrente` (monto, categoría, día del mes, tipo) + el cron diario existente los materializa y avisa. Alternativa mínima: botón "Duplicar" en cada movimiento (esfuerzo casi nulo, 60% del valor).

### N3. Notificaciones de vencimientos

"Próximos vencimientos" ya existe pero solo se ve entrando al dashboard. Un paso del cron diario que envíe email (cuando haya proveedor) o un badge rojo en el ítem Finanzas del sidebar con los vencimientos ≤7 días. La información urgente debe buscar al usuario, no esperar a ser encontrada.

### N4. Exportar a Excel/CSV

Contadores y bancos piden Excel. Botón "Exportar" en Ingresos/Gastos/Deudas y en la tabla mensual (CSV con codificación UTF-8-BOM para que Excel lo abra bien). Backend trivial; enorme utilidad práctica.

### N5. Presupuesto mensual por categoría

Definir un tope de gasto por categoría y mostrar un meter (gastado/presupuesto) en el desglose colapsable del dashboard + color de estado al 80%/100%. Convierte a Finanzas de "registro pasivo" a "control activo".

### N6. Comprobante también en captura manual

Hoy solo el flujo OCR adjunta foto. Agregar "📎 Adjuntar comprobante" opcional al formulario manual de gasto/ingreso (la infraestructura completa ya existe).

---

## 🟡 Experiencia de uso y acceso

### U1. PWA — instalar en el teléfono
`manifest.json` + service worker básico → ícono en el home screen del teléfono de cada miembro de la familia, pantalla completa sin barra del navegador. Con lo mobile que ya es el flujo (cámara, OCR), es el complemento natural. Esfuerzo bajo.

### U2. Cloudflare Tunnel (la Fase 2 pendiente de CotizacionPublica)
Desbloquea: QRs de cotización que funcionan fuera de la red, acceso familiar sin Tailscale, y HTTPS real. Ya está analizado; falta ejecutarlo. Sin esto, la página pública de cotizaciones rinde una fracción de su valor.

### U3. Búsqueda y filtro de fechas en las tablas
El backend ya soporta `search` y `filterset` en casi todos los ViewSets — el frontend nunca los usa. Una barra de búsqueda + rango de fechas en Ingresos/Gastos/Cotizaciones/Clientes. (Se resuelve junto con C1, que ya toca todas las tablas.)

### U4. Dashboard Fase 2 pendiente
Selector de período (Este mes / Mes pasado / Año) y carga diferida por tab — ya planeado en [DashboardFinanzasUX](DashboardFinanzasUX.md), no ejecutado.

### U5. Modo oscuro
El tema ya vive en variables CSS con override por organización — agregar una paleta oscura y un toggle es barato y muy pedido en uso nocturno de teléfono.

---

## 🔵 Salud técnica y optimización

### T1. Bundle único de 841 KB
Todo el frontend (recharts, dnd-kit, las 25 páginas) viaja en un solo JS. En un teléfono por Tailscale, la primera carga se siente. `React.lazy` por ruta (PDF Tools, Fibras y Finanzas son los pesados) baja la carga inicial a una fracción. Esfuerzo medio-bajo, se hace una vez.

### T2. Comprimir comprobantes al guardar
Una foto de teléfono pesa 3-8 MB; a foto por gasto, el disco del servidor lo siente en meses. Redimensionar a ~1600px y recomprimir JPEG (calidad 80) al guardar — Pillow ya está. Reduce ~10× el almacenamiento sin perder legibilidad.

### T3. Dashboard de finanzas: 24 queries por carga
El resumen de 12 meses hace 2 queries por mes en un loop. Con `TruncMonth` + `annotate` son 2 queries totales. Invisible hoy; importa cuando haya años de datos (y es limpieza barata).

### T4. Warnings de paginación inconsistente
`UnorderedObjectListWarning` en `Servicio` y `CategoriaDeuda` (sin `ordering`): el orden entre páginas puede variar. Fix de una línea por modelo (agregar `ordering` al Meta).

### T5. OCR bloquea un worker de gunicorn
Con 3 workers sync, una tanda de 10 imágenes (~50 s) ocupa un worker completo. A escala familiar es aceptable; si crece el uso, mover OCR a un worker aparte o bajar el límite por tanda. Solo vigilar, no actuar aún.

### T6. Pendientes ya conocidos del roadmap
Email de invitaciones (elegir proveedor — el código ya está listo), panel super admin, y el **commit de git** que acumula ~8 features y 4 migraciones sin versionar (riesgo real: un `rm` desafortunado y no hay historia).

---

## Matriz de priorización

| # | Mejora | Impacto | Esfuerzo | Nota |
|---|--------|---------|----------|------|
| C1 | Paginación + totales del backend | 🔥 Crítico | Medio | Totales incorrectos al registro 21 |
| C2 | Backups automáticos | 🔥 Crítico | Bajo | Datos reales sin respaldo |
| — | Commit git | 🔥 Crítico | Trivial | 8 features sin versionar |
| C3 | Editar movimientos | Alto | Bajo | Backend ya lo soporta |
| N1 | Cotización → Ingreso | Alto | Bajo | Integración con más valor/costo |
| N4 | Export CSV/Excel | Alto | Bajo | Pedido universal de negocio |
| U2 | Cloudflare Tunnel | Alto | Bajo | Desbloquea QR público + HTTPS |
| N3 | Aviso de vencimientos | Alto | Bajo-Medio | Badge sidebar ahora; email después |
| N2 | Recurrentes (o "Duplicar") | Alto | Medio (botón: trivial) | Empezar por Duplicar |
| U1 | PWA | Medio-Alto | Bajo | Uso móvil familiar |
| T1 | Code splitting | Medio | Medio-Bajo | Primera carga móvil |
| T2 | Comprimir comprobantes | Medio | Bajo | Previene problema de disco |
| N5 | Presupuestos por categoría | Medio | Medio | Registro → control |
| U3 | Búsqueda/filtros en tablas | Medio | Medio | Junto con C1 |
| U4 | Dashboard Fase 2 | Medio | Bajo | Ya planeado |
| N6 | Comprobante manual | Medio | Trivial | Infra ya existe |
| U5 | Modo oscuro | Medio | Bajo | — |
| T3/T4 | Queries dashboard + ordering | Bajo | Trivial | Higiene |

## Roadmap sugerido en 3 olas

1. **Ola 1 — Confianza en los datos** (lo no negociable): commit git → C2 backups → C1 paginación/totales → C3 editar → T4.
2. **Ola 2 — Valor de negocio**: N1 cotización→ingreso → N4 export → botón Duplicar (N2 mínimo) → N6 → N3 badge de vencimientos → U2 túnel.
3. **Ola 3 — Pulido y escala**: U1 PWA → T1 code splitting → T2 compresión → U4 dashboard fase 2 → N5 presupuestos → U3 búsqueda → U5 dark mode.
