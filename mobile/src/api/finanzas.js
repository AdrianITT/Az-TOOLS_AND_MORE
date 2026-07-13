import { api } from './client'

// tipo: 'ingresos' | 'gastos'
export const rutaMovimientos = (tipo) => `/finanzas/${tipo}/`
export const rutaCategorias = (tipo) => (tipo === 'ingresos' ? '/finanzas/categorias-ingresos/' : '/finanzas/categorias-gastos/')

export function listarMovimientos(tipo, { pageUrl, ...filtros } = {}) {
  if (pageUrl) return api.get(pageUrl)
  return api.get(rutaMovimientos(tipo), filtros)
}

export function crearMovimiento(tipo, datos, comprobante) {
  if (comprobante) return api.upload(rutaMovimientos(tipo), datos, { comprobante })
  return api.post(rutaMovimientos(tipo), datos)
}

export function editarMovimiento(tipo, id, datos, comprobante) {
  if (comprobante) return api.upload(`${rutaMovimientos(tipo)}${id}/`, datos, { comprobante }, 'PATCH')
  return api.patch(`${rutaMovimientos(tipo)}${id}/`, datos)
}

export function eliminarMovimiento(tipo, id) {
  return api.delete(`${rutaMovimientos(tipo)}${id}/`)
}

export function listarCategorias(tipo) {
  return api.get(rutaCategorias(tipo))
}

export function crearCategoria(tipo, datos) {
  return api.post(rutaCategorias(tipo), datos)
}
