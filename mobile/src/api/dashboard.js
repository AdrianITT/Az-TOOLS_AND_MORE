import { api } from './client'

export function dashboard() {
  return api.get('/finanzas/dashboard/')
}

export function detalleMes(mes) {
  return api.get('/finanzas/dashboard/detalle-mes/', { mes })
}

export function resumenPorCategoria(periodo = 'mes', tipo = 'gastos') {
  return api.get('/finanzas/resumen-por-categoria/', { periodo, tipo })
}

export function gastosPorDia(periodo = 'mes') {
  return api.get('/finanzas/gastos-por-dia/', { periodo })
}
