import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { Input } from './Input'

/** Acordeón para campos opcionales: los pliega detrás de "▸ Más opciones". */
export function MasOpciones({ etiqueta = 'Más opciones', children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--color-primary, #3498db)', fontSize: 14, fontWeight: 600,
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />} {etiqueta}
      </button>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

/** Input de monto protagonista: grande, con prefijo $. */
export function InputMonto({ style, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        fontWeight: 600, fontSize: 18, color: '#999', pointerEvents: 'none',
      }}>
        $
      </span>
      <Input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        placeholder="0.00"
        {...props}
        style={{ fontSize: 20, fontWeight: 600, paddingLeft: 30, width: '100%', ...style }}
      />
    </div>
  )
}

/**
 * Indicador de pasos ① ② ③ para flujos multi-paso.
 * pasos: [{ label, estado: 'hecho' | 'activo' | 'pendiente' }]
 */
export function PasosFlujo({ pasos }) {
  const colores = {
    hecho: { bg: '#27ae60', fg: 'white', texto: '#27ae60' },
    activo: { bg: 'var(--color-primary, #3498db)', fg: 'white', texto: 'var(--color-text, #333)' },
    pendiente: { bg: 'rgba(0,0,0,0.12)', fg: '#888', texto: '#999' },
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      {pasos.map((p, i) => {
        const c = colores[p.estado] ?? colores.pendiente
        return (
          <Fragment key={p.label}>
            {i > 0 && <span style={{ flex: 1, minWidth: 16, maxWidth: 60, height: 2, background: 'rgba(0,0,0,0.12)' }} />}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: c.bg, color: c.fg,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {p.estado === 'hecho' ? <Check size={14} /> : i + 1}
              </span>
              <span style={{ fontSize: 13, fontWeight: p.estado === 'activo' ? 700 : 500, color: c.texto }}>
                {p.label}
              </span>
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}
