const BASE_URL = '/api'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Token ${token}`

  const response = await fetch(url.pathname + url.search, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.detail || data?.error || 'Error en la solicitud'
    throw new ApiError(message, response.status, data)
  }

  return data
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

function firstMessage(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMessage(item)
      if (found) return found
    }
    return null
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = firstMessage(value[key])
      if (found) return found
    }
  }
  return null
}

export function getErrorMessage(err, fallback = 'Ocurrió un error') {
  return err?.data?.detail || firstMessage(err?.data) || fallback
}

export { ApiError }
