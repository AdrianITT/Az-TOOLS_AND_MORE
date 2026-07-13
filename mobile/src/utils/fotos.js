import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { File } from 'expo-file-system'

const MAX_ANCHO = 1600 // tesseract no mejora por encima de ~1600px y el peso baja 10x
const LIMITE_OCR = 5 * 1024 * 1024 // límite del backend por imagen

async function comprimir(uri, compress = 0.8) {
  const contexto = ImageManipulator.manipulate(uri)
  contexto.resize({ width: MAX_ANCHO })
  const imagen = await contexto.renderAsync()
  const resultado = await imagen.saveAsync({ compress, format: SaveFormat.JPEG })
  return resultado.uri
}

function tamano(uri) {
  try {
    return new File(uri).size ?? 0
  } catch {
    return 0
  }
}

// Comprime una foto de cámara/galería y garantiza <5MB (el límite del OCR).
// Devuelve un asset {uri, name, type} listo para FormData de React Native.
export async function prepararFoto(asset, indice = 0) {
  let uri = await comprimir(asset.uri, 0.8)
  if (tamano(uri) > LIMITE_OCR) uri = await comprimir(asset.uri, 0.6)
  return { uri, name: asset.fileName || `recibo-${Date.now()}-${indice}.jpg`, type: 'image/jpeg' }
}

export async function tomarFoto() {
  const permiso = await ImagePicker.requestCameraPermissionsAsync()
  if (!permiso.granted) return []
  const res = await ImagePicker.launchCameraAsync({ quality: 1 })
  return res.canceled ? [] : res.assets
}

export async function elegirDeGaleria({ multiple = false, max = 10 } = {}) {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: multiple,
    selectionLimit: max,
  })
  return res.canceled ? [] : res.assets.slice(0, max)
}
