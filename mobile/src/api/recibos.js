import { api } from './client'

// `imagenes`: assets {uri, name, type} ya comprimidos (límite servidor: 5MB c/u, máx 10).
// Devuelve un array con {archivo, monto, fecha, comercio, confianza, texto_crudo, fecha_vencimiento?}.
export function analizarRecibos(imagenes, contexto = 'movimiento') {
  const query = contexto === 'deuda' ? '?contexto=deuda' : ''
  return api.upload(`/finanzas/recibos/analizar/${query}`, {}, { imagenes })
}
