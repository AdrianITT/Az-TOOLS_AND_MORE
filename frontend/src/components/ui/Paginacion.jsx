import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

/** Controles de paginación para las respuestas paginadas de DRF.
 *  No renderiza nada si todo cabe en una página. */
export function Paginacion({ page, count, pageSize = 20, onPage }) {
  const totalPaginas = Math.max(1, Math.ceil(count / pageSize))
  if (totalPaginas <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} />
      </Button>
      <span style={{ fontSize: 13, color: '#666' }}>
        Página {page} de {totalPaginas} · {count} registros
      </span>
      <Button variant="secondary" disabled={page >= totalPaginas} onClick={() => onPage(page + 1)}>
        <ChevronRight size={16} />
      </Button>
    </div>
  )
}
