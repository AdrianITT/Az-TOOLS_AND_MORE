import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import styles from '../shared-form.module.css'

const TIPOS = [
  { value: 'pastel', label: 'Pastel' },
  { value: 'tapiceria', label: 'Tapicería' },
  { value: 'otro', label: 'Otro Servicio' },
]

const emptyForm = { nombre: '', tipo: 'otro', precio_base: '', descripcion: '' }

export function Servicios() {
  const [servicios, setServicios] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api
      .get('/servicios/')
      .then((data) => setServicios(data.results ?? data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await api.post('/servicios/', form)
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.data?.detail || 'No se pudo crear el servicio')
    }
  }

  return (
    <div>
      <PageHeader
        title="Servicios"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nuevo servicio'}</Button>}
      />

      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <Field label="Nombre">
                <Input value={form.nombre} onChange={update('nombre')} required />
              </Field>
              <Field label="Tipo">
                <Select value={form.tipo} onChange={update('tipo')}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className={styles.row}>
              <Field label="Precio base">
                <Input
                  type="number"
                  step="0.01"
                  value={form.precio_base}
                  onChange={update('precio_base')}
                  required
                />
              </Field>
              <Field label="Descripción">
                <Input value={form.descripcion} onChange={update('descripcion')} />
              </Field>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <Button type="submit">Guardar</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <Table
          rowKey={(s) => s.id}
          emptyMessage="Todavía no hay servicios"
          columns={[
            { key: 'nombre', header: 'Nombre' },
            { key: 'tipo', header: 'Tipo' },
            { key: 'precio_base', header: 'Precio base', render: (s) => `$${s.precio_base}` },
            { key: 'activo', header: 'Estado', render: (s) => (s.activo ? 'Activo' : 'Inactivo') },
          ]}
          rows={servicios}
        />
      )}
    </div>
  )
}
