import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { getBaseUrl } from '../api/client'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? MXN.format(n) : '—'
}

export function hoyISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function fechaLarga(iso) {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), "d 'de' MMMM yyyy", { locale: es })
  } catch {
    return iso
  }
}

export function mesLabel(yyyyMM) {
  try {
    return format(parseISO(`${yyyyMM}-01`), 'MMM yyyy', { locale: es })
  } catch {
    return yyyyMM
  }
}

// El backend devuelve `comprobante` como URL relativa (/media/…): hay que
// prefijar el host configurado para que <Image> pueda cargarla.
export function mediaUrl(rel) {
  if (!rel) return null
  if (rel.startsWith('http')) return rel
  return `${getBaseUrl()}${rel}`
}
