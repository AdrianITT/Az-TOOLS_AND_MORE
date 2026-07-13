import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const SERVER_URL_KEY = 'server_url'
const TOKEN_KEY = 'auth_token'

// Cache en memoria: SecureStore/AsyncStorage son async, pero el cliente
// necesita valores síncronos en cada request. Se hidratan en initSession().
let baseUrl = ''
let token = null
let onUnauthorized = null

export function getBaseUrl() {
  return baseUrl
}

export async function setBaseUrl(url) {
  baseUrl = (url || '').trim().replace(/\/+$/, '')
  await AsyncStorage.setItem(SERVER_URL_KEY, baseUrl)
}

export function getToken() {
  return token
}

export async function setToken(value) {
  token = value
  if (value) await SecureStore.setItemAsync(TOKEN_KEY, value)
  else await SecureStore.deleteItemAsync(TOKEN_KEY)
}

// AuthContext registra aquí su handler: ante un 401 se limpia la sesión
// y la navegación vuelve sola al Login.
export function setOnUnauthorized(handler) {
  onUnauthorized = handler
}

// Hidrata host y token guardados; devuelve lo encontrado para decidir
// la pantalla inicial (Login vs tabs).
export async function initSession() {
  const [storedUrl, storedToken] = await Promise.all([
    AsyncStorage.getItem(SERVER_URL_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
  ])
  baseUrl = storedUrl || ''
  token = storedToken || null
  return { baseUrl, token }
}

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.esRed = status === 0
  }
}

function extraerMensaje(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (Array.isArray(data)) return data.map((d) => extraerMensaje(d, '')).filter(Boolean).join(' ') || fallback
  // Errores de campo DRF: {campo: ["msg"]}
  const partes = Object.entries(data).map(([campo, msgs]) => {
    const texto = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
    return campo === 'non_field_errors' ? texto : `${campo}: ${texto}`
  })
  return partes.join('\n') || fallback
}

export function getErrorMessage(err, fallback = 'Ocurrió un error') {
  if (err instanceof ApiError) {
    if (err.esRed) return 'No se pudo conectar al servidor. Verifica la IP en Ajustes y tu red.'
    return extraerMensaje(err.data, fallback)
  }
  return err?.message || fallback
}

async function ejecutar(url, options) {
  if (!baseUrl) throw new ApiError('Servidor no configurado', { status: 0 })
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new ApiError('Error de red', { status: 0 })
  }
  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError('Sesión expirada', { status: 401 })
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, { status: res.status, data })
  return data
}

function resolver(pathOrUrl) {
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  return `${baseUrl}/api${pathOrUrl}`
}

function headersAuth(extra = {}) {
  return token ? { Authorization: `Token ${token}`, ...extra } : { ...extra }
}

export const api = {
  // Acepta paths ('/finanzas/gastos/') o URLs absolutas (el `next` de la paginación DRF)
  get(pathOrUrl, params) {
    let url = resolver(pathOrUrl)
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ).toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }
    return ejecutar(url, { headers: headersAuth() })
  },

  post(path, body) {
    return ejecutar(resolver(path), {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body ?? {}),
    })
  },

  patch(path, body) {
    return ejecutar(resolver(path), {
      method: 'PATCH',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body ?? {}),
    })
  },

  delete(path) {
    return ejecutar(resolver(path), { method: 'DELETE', headers: headersAuth() })
  },

  // Multipart para fotos. `files`: {campo: asset | asset[]} con {uri, name, type}.
  // No fijar Content-Type: fetch genera el boundary correcto solo.
  upload(path, fields = {}, files = {}, method = 'POST') {
    const form = new FormData()
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) v.forEach((item) => form.append(k, String(item)))
        else form.append(k, String(v))
      }
    })
    Object.entries(files).forEach(([campo, asset]) => {
      const lista = Array.isArray(asset) ? asset : [asset]
      lista.forEach((a) => {
        if (a) form.append(campo, { uri: a.uri, name: a.name || 'foto.jpg', type: a.type || 'image/jpeg' })
      })
    })
    return ejecutar(resolver(path), { method, headers: headersAuth(), body: form })
  },
}
