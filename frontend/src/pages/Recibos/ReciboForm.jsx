import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { MasOpciones } from '../../components/ui/FormExtras'
import formStyles from '../shared-form.module.css'

const emptyForm = {
  cliente_nombre: '',
  cliente: '',
  producto_nombre: '',
  producto: '',
  cantidad: '1',
  cantidad_personas: '1',
  monto_total: '',
  monto_pagado: '0',
  descripcion: '',
}

export function ReciboForm({ id, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyForm)
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(id ? true : false)

  useEffect(() => {
    Promise.all([
      api.get('/clientes/', { page_size: 200 }).then((d) => setClientes(d.results ?? d)).catch(() => {}),
      api.get('/servicios/', { page_size: 200 }).then((d) => setServicios(d.results ?? d)).catch(() => {}),
    ])
    if (id) {
      api
        .get(`/finanzas/recibos/${id}/`)
        .then((data) => setForm(data))
        .catch(() => setError('No se pudo cargar el recibo'))
        .finally(() => setLoading(false))
    }
  }, [id])

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.cliente_nombre.trim() && !form.cliente) {
      setError('Necesitás nombre del cliente o seleccionar uno')
      return
    }
    if (!form.producto_nombre.trim() && !form.producto) {
      setError('Necesitás nombre del producto o seleccionar uno')
      return
    }
    if (!form.monto_total) {
      setError('Necesitás ingresar el monto total')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        cliente_nombre: form.cliente_nombre || '',
        cliente: form.cliente || null,
        producto_nombre: form.producto_nombre || '',
        producto: form.producto || null,
        cantidad: form.cantidad,
        cantidad_personas: form.cantidad_personas,
        monto_total: form.monto_total,
        monto_pagado: form.monto_pagado || 0,
        descripcion: form.descripcion,
      }
      if (id) {
        await api.patch(`/finanzas/recibos/${id}/`, payload)
      } else {
        await api.post('/finanzas/recibos/', payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar el recibo'))
    } finally {
      setSubmitting(false)
    }
  }

  const montoRestante = Math.max(0, (parseFloat(form.monto_total || 0) - parseFloat(form.monto_pagado || 0)).toFixed(2))

  if (loading) return <p>Cargando…</p>

  return (
    <Card style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>{id ? 'Editar recibo' : 'Nuevo recibo'}</h3>
      <form className={formStyles.form} onSubmit={handleSubmit}>
        {error && <p className={formStyles.error}>{error}</p>}

        <div className={formStyles.row}>
          <Field label="Cliente (nombre libre)">
            <Input
              value={form.cliente_nombre}
              onChange={update('cliente_nombre')}
              placeholder="O selecciona uno abajo"
            />
          </Field>
          <Field label="O selecciona cliente existente">
            <Select value={form.cliente || ''} onChange={update('cliente')}>
              <option value="">Ninguno</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className={formStyles.row}>
          <Field label="Producto/Servicio (nombre libre)">
            <Input
              value={form.producto_nombre}
              onChange={update('producto_nombre')}
              placeholder="O selecciona uno abajo"
            />
          </Field>
          <Field label="O selecciona existente">
            <Select value={form.producto || ''} onChange={update('producto')}>
              <option value="">Ninguno</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className={formStyles.row}>
          <Field label="Cantidad">
            <Input
              type="number"
              step="0.01"
              value={form.cantidad}
              onChange={update('cantidad')}
              required
            />
          </Field>
          <Field label="Cantidad de personas">
            <Input
              type="number"
              value={form.cantidad_personas}
              onChange={update('cantidad_personas')}
            />
          </Field>
        </div>

        <div className={formStyles.row}>
          <Field label="Monto total">
            <Input
              type="number"
              step="0.01"
              value={form.monto_total}
              onChange={update('monto_total')}
              required
            />
          </Field>
          <Field label="Monto pagado">
            <Input
              type="number"
              step="0.01"
              value={form.monto_pagado}
              onChange={update('monto_pagado')}
            />
          </Field>
        </div>

        {form.monto_total && (
          <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            <strong>Monto restante:</strong> <span style={{ color: montoRestante === '0.00' ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>
              ${montoRestante}
            </span>
          </div>
        )}

        <MasOpciones etiqueta="Más opciones (descripción)">
          <Field label="Descripción / Notas">
            <Input
              value={form.descripcion}
              onChange={update('descripcion')}
              placeholder="Opcional"
            />
          </Field>
        </MasOpciones>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear recibo'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
