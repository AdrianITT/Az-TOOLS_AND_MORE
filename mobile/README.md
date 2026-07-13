# Finanzas Az — App Android

App móvil (React Native + Expo) del módulo de **Finanzas**: ingresos, gastos,
escaneo OCR de recibos, deudas con pagos y dashboard con gráficas. Consume la
misma API del backend Django (`/api/finanzas/`) que usa el frontend web, por lo
que los datos son los mismos en web y móvil.

## Requisitos

- Node 20+
- El backend corriendo (normalmente `docker compose up` en la raíz del repo).
- Teléfono Android en la **misma red** que el servidor (LAN o Tailscale).
- Para desarrollo: la app **Expo Go** instalada en el teléfono (Play Store).

## Desarrollo (Expo Go)

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go. La primera vez, dentro de la app:

1. Toca **⚙️ Ajustes del servidor** en la pantalla de login.
2. Escribe la dirección del servidor, ej. `http://192.168.1.101` (LAN) o
   `http://100.96.46.88` (Tailscale). Es el host del nginx (puerto 80), **no**
   el `:8000` del backend.
3. **Probar conexión** → **Guardar**, y entra con tu usuario del sistema.

La sesión usa el token DRF guardado en el Keystore de Android; se conserva al
cerrar la app. "Cerrar sesión" (en Ajustes) revoca el token también en el
servidor (`POST /api/auth/logout/`).

## Estructura

```
src/
├── api/        # cliente HTTP (host configurable, token, multipart, paginación DRF)
├── screens/    # Login, Ajustes, Ingresos/Gastos, OCR, Deudas, Dashboard…
├── components/ # UI compartida (botones, campos, picker de categorías, fotos)
├── context/    # AuthContext (sesión)
├── theme/      # colores replicados de frontend/src/styles/variables.css
└── utils/      # formato moneda/fecha, mediaUrl(), compresión de fotos
```

Notas de diseño:

- **Paginación**: las listas usan `useInfiniteQuery` con la URL `next` literal
  que devuelve DRF; no se piden páginas por número.
- **Fotos**: toda imagen se comprime antes de subir (ancho máx 1600px, JPEG)
  para respetar el límite de 5MB por imagen del OCR.
- **Comprobantes**: el backend devuelve URLs relativas (`/media/…`); siempre se
  pintan a través de `mediaUrl()` que antepone el host configurado.
- **Multipart**: nunca fijar `Content-Type` a mano; fetch genera el boundary.

## Generar la APK (distribución directa, sin Play Store)

La app habla HTTP plano con el servidor de la LAN; los builds release lo
permiten porque `app.json` configura `usesCleartextTraffic: true` vía
`expo-build-properties`. Sin eso, la APK no conectaría aunque Expo Go sí.

### Opción A — EAS Build (en la nube, sin Android SDK local)

```bash
npm install -g eas-cli
eas login                      # cuenta gratuita de expo.dev
eas build:configure
eas build -p android --profile preview   # profile preview genera APK
```

En `eas.json`, el profile `preview` debe tener `"android": {"buildType": "apk"}`.
Descarga la APK del enlace que imprime, pásala al teléfono e instálala
(habilitar "instalar apps de origen desconocido").

### Opción B — Build local (requiere JDK 17 + Android SDK)

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# APK en android/app/build/outputs/apk/release/app-release.apk
```

## Solución de problemas

- **"No se pudo conectar al servidor"**: verifica la IP en Ajustes, que el
  teléfono esté en la misma red y que `docker compose ps` muestre el frontend
  (nginx) arriba. Si cambió la IP LAN del servidor, actualiza también
  `ALLOWED_HOSTS` en el `.env` del backend.
- **Imágenes de comprobantes rotas**: casi siempre es un host mal configurado
  en Ajustes (las URLs `/media/` se prefijan con él).
- **401 constante**: el token fue revocado (p. ej. desde el admin de Django);
  la app vuelve sola al login — entra de nuevo.
