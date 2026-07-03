const BASE_URL = '/api/pdf'

class PdfToolError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function getToken() {
  return localStorage.getItem('token')
}

function buildFormData(fields) {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item))
    } else {
      formData.append(key, value)
    }
  })
  return formData
}

function filenameFromContentDisposition(header, fallback) {
  const match = /filename="?([^"]+)"?/.exec(header || '')
  return match ? match[1] : fallback
}

async function extractErrorMessage(response) {
  try {
    const text = await response.text()
    const data = JSON.parse(text)
    return data.detail || data.files?.[0] || data.file?.[0] || data.operations?.[0] || null
  } catch {
    return null
  }
}

/**
 * Envía un formulario multipart a una herramienta PDF y descarga el archivo
 * resultante (blob). Usa XMLHttpRequest (en vez del cliente `api` basado en
 * fetch/JSON) porque necesita FormData, respuesta binaria y progreso de subida.
 */
export function uploadFormForPdf(endpoint, fields, { onProgress, fallbackFilename = 'resultado.pdf' } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}${endpoint}`)

    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Token ${token}`)
    xhr.responseType = 'blob'

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const filename = filenameFromContentDisposition(
          xhr.getResponseHeader('Content-Disposition'), fallbackFilename,
        )
        resolve({ blob: xhr.response, filename })
        return
      }
      const message = (await extractErrorMessage(xhr.response)) || 'Ocurrió un error al procesar los archivos.'
      reject(new PdfToolError(message, xhr.status))
    }

    xhr.onerror = () => reject(new PdfToolError('Error de red al subir los archivos.'))

    xhr.send(buildFormData(fields))
  })
}

/** Igual que `uploadFormForPdf`, pero espera una respuesta JSON en vez de un blob. */
export async function uploadFormForJson(endpoint, fields) {
  const token = getToken()
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Token ${token}` } : undefined,
    body: buildFormData(fields),
  })

  if (!response.ok) {
    const message = (await extractErrorMessage(response)) || 'Ocurrió un error al leer el archivo.'
    throw new PdfToolError(message, response.status)
  }

  return response.json()
}

export function uploadFilesForPdf(endpoint, files, options = {}) {
  const { onProgress, outputName, fallbackFilename, ...extraFields } = options
  return uploadFormForPdf(
    endpoint, { files, output_name: outputName, ...extraFields }, { onProgress, fallbackFilename },
  )
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export { PdfToolError }
