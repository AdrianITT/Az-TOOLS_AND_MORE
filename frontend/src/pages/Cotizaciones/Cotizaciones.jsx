import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import styles from '../shared-form.module.css'

const ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'expirada', label: 'Expirada' },
]

const emptyForm = { cliente: '', descripcion: '', fecha_vencimiento: '' }

export function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api
      .get('/cotizaciones/')
      .then((data) => setCotizaciones(data.results ?? data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/clientes/').then((data) => setClientes(data.results ?? data))
  }, [])

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await api.post('/cotizaciones/', form)
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.data?.detail || 'No se pudo crear la cotización')
    }
  }

  async function cambiarEstado(cotizacion, estado) {
    await api.post(`/cotizaciones/${cotizacion.id}/cambiar_estado/`, { estado })
    load()
  }

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nueva cotización'}</Button>}
      />

      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <Field label="Cliente">
                <Select value={form.cliente} onChange={update('cliente')} required>
                  <option value="">Seleccionar…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha de vencimiento">
                <Input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={update('fecha_vencimiento')}
                  required
                />
              </Field>
            </div>
            <Field label="Descripción">
              <Input value={form.descripcion} onChange={update('descripcion')} />
            </Field>
            {error && <p className={styles.error}>{error}</p>}
            <Button type="submit">Guardar</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <Table
          rowKey={(c) => c.id}
          emptyMessage="Todavía no hay cotizaciones"
          columns={[
            { key: 'numero', header: 'Número' },
            { key: 'total', header: 'Total', render: (c) => `$${c.total}` },
            {
              key: 'estado',
              header: 'Estado',
              render: (c) => (
                <Select value={c.estado} onChange={(e) => cambiarEstado(c, e.target.value)}>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </Select>
              ),
            },
            { key: 'fecha_vencimiento', header: 'Vence' },
          ]}
          rows={cotizaciones}
        />
      )}
    </div>
  )
}
