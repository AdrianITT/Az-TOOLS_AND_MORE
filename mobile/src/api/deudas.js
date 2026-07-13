import { api } from './client'

export function listarDeudas({ pageUrl, ...filtros } = {}) {
  if (pageUrl) return api.get(pageUrl)
  return api.get('/finanzas/deudas/', filtros)
}

export function obtenerDeuda(id) {
  return api.get(`/finanzas/deudas/${id}/`)
}

export function crearDeuda(datos, comprobante) {
  if (comprobante) return api.upload('/finanzas/deudas/', datos, { comprobante })
  return api.post('/finanzas/deudas/', datos)
}

export function listarCategoriasDeuda() {
  return api.get('/finanzas/categorias-deudas/')
}

export function crearCategoriaDeuda(datos) {
  return api.post('/finanzas/categorias-deudas/', datos)
}

export function listarPagos(deudaId) {
  return api.get(`/finanzas/deudas/${deudaId}/pagos/`)
}

// El servidor recalcula saldo_actual y puede cerrar la deuda: siempre
// invalidar las queries de deudas tras registrar un pago.
export function registrarPago(deudaId, datos, comprobante) {
  if (comprobante) return api.upload(`/finanzas/deudas/${deudaId}/pagos/`, datos, { comprobante })
  return api.post(`/finanzas/deudas/${deudaId}/pagos/`, datos)
}

export function resumenDeudas() {
  return api.get('/finanzas/deudas/resumen/')
}

export function proximosVencimientos(dias = 30) {
  return api.get('/finanzas/deudas/proximos-vencimientos/', { dias })
}

export function gastosSinPago() {
  return api.get('/finanzas/gastos/', { sin_pago_deuda: 'true' })
}
