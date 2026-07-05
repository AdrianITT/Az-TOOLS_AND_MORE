# Pruebas de Flujo Completo — Copiar enlace de invitación (sección 8 de `ListUpdata.MD`)

Fecha: 2026-07-05
Entorno: backend Django (`manage.py runserver`) en `http://127.0.0.1:8000` con SQLite local, frontend Vite en `http://127.0.0.1:5177`. Pruebas de UI con navegador real (Chromium vía Playwright), incluyendo simulación del entorno real de producción (contexto no seguro).

## Causa raíz real

`copiarLink` (`frontend/src/pages/Usuarios/Usuarios.jsx`) llamaba directamente a `navigator.clipboard.writeText(link)`. La API `navigator.clipboard` **solo existe en contextos seguros** (HTTPS, o `http://localhost`/`127.0.0.1`) — no es que falle silenciosamente, directamente **no está definida** (`navigator.clipboard === undefined`) en cualquier otro origen.

Se confirmó que la configuración real de producción (`.env` de la raíz) usa `FRONTEND_URL=http://192.168.1.101:8080` — HTTP plano sobre una IP de LAN, **no** un contexto seguro. Esto significa que en el entorno real donde se reportó el bug, `navigator.clipboard` es `undefined` para todos los usuarios, y `copiarLink` fallaba siempre (no "en algunos casos" como se sospechaba inicialmente, sino consistentemente en el despliegue real).

## Resolución aplicada

Se agregó una función `copiarAlPortapapeles()` con fallback:
1. Si `navigator.clipboard` existe y `window.isSecureContext` es verdadero, usa la API moderna (comportamiento sin cambios para desarrollo local/HTTPS).
2. Si no, usa el mecanismo clásico: crea un `<textarea>` oculto con el link, lo selecciona y ejecuta `document.execCommand('copy')` (no requiere contexto seguro).

`copiarLink` ahora:
- Limpia el error previo antes de reintentar.
- Si ambos mecanismos fallan, muestra un mensaje claro **con el link completo incluido** para que el usuario pueda copiarlo manualmente seleccionándolo, en vez del mensaje genérico anterior ("No se pudo copiar el link").

## Pruebas realizadas (navegador real, Chromium vía Playwright, 3 escenarios)

| Escenario | Simulación | Resultado |
|---|---|---|
| Contexto seguro (desarrollo local / HTTPS) | Ninguna (comportamiento por defecto de Playwright en `localhost`) | `navigator.clipboard.writeText` funciona; se verificó leyendo el portapapeles con `navigator.clipboard.readText()` que el link copiado es exactamente el esperado (`http://.../invitaciones/aceptar/<token>`) |
| **Contexto NO seguro (el caso real de producción)** | `navigator.clipboard` redefinido a `undefined` y `window.isSecureContext = false` vía `page.addInitScript` | El fallback con `execCommand('copy')` se activa automáticamente; se muestra "¡Copiado!" correctamente, sin mensaje de error |
| Fallo total (ni Clipboard API ni `execCommand` disponibles) | Además de lo anterior, se sobreescribió `document.execCommand` para que siempre devuelva `false` | Se muestra el mensaje de error con el link completo visible en pantalla para copiarlo manualmente |

Sin errores de consola de JavaScript en ninguno de los 3 escenarios.

## Hallazgo adicional (no relacionado, corregido solo en datos de prueba)

Durante la preparación del entorno de prueba se encontró que crear una organización con `plan='pro'` (valor que había usado repetidamente en sesiones anteriores de este mismo trabajo para otras pruebas) causa un `500` real al crear una invitación: `Organization.puede_crear_usuarios()` hace `self.PLAN_LIMITES_USUARIOS[self.plan]` sin `.get()` ni manejo de `KeyError`, y `'pro'` no es un valor válido de `PLAN_CHOICES` (los válidos son `basico`/`profesional`/`empresa`). Esto **no es un bug de producción** (las organizaciones reales siempre se crean con un plan válido desde `RegistroOrganizacionSerializer`), fue un error en mis propios datos de prueba de sesiones anteriores. Se corrigió el dato de prueba (a `'basico'`) para poder continuar; se menciona acá únicamente por transparencia, sin tocar código de producción por esto.

## Limpieza

`backend/.env` (copia temporal) y `backend/db.sqlite3` eliminados al finalizar; no se tocó el Postgres de producción.
