import { useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { Button } from './Button'
import { Input, Select } from './Input'

export const TIPO_AMORTIZACION_OPTIONS = [
  { value: 'revolvente', label: 'Revolvente (tarjeta, línea de crédito)' },
  { value: 'cuotas_fijas', label: 'Cuotas fijas (préstamo, hipoteca)' },
  { value: 'cuenta_por_pagar', label: 'Cuenta por pagar (proveedor, impuesto)' },
]

/** Mini-formulario inline para crear una categoría sin desmontar el formulario padre.
 *  Es un <div> (no <form>) porque vive anidado dentro de otros formularios. */
export function CategoriaInline({ conTipo = false, onCrear, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(conTipo ? '#e74c3c' : '#3498db')
  const [tipo, setTipo] = useState('cuotas_fijas')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function crear() {
    if (!nombre.trim()) {
      setError('Escribí un nombre para la categoría')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onCrear(conTipo ? { nombre, color, tipo_amortizacion: tipo } : { nombre, color })
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la categoría'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      border: '1.5px dashed var(--color-primary, #3498db)', borderRadius: 8, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <strong style={{ fontSize: 13 }}>Nueva categoría</strong>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la categoría"
          autoFocus
          style={{ flex: 2, minWidth: 140 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              crear()
            }
          }}
        />
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 38, padding: 2, flexShrink: 0 }} />
        {conTipo && (
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ flex: 2, minWidth: 200 }}>
            {TIPO_AMORTIZACION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        )}
        <Button type="button" onClick={crear} disabled={saving}>
          Crear
        </Button>
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
      {error && <p style={{ color: 'var(--color-danger, #e74c3c)', fontSize: 14, margin: 0 }}>{error}</p>}
    </div>
  )
}
