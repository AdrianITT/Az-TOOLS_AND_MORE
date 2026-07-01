import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import styles from '../shared-form.module.css'

const TIPOS = [
  { value: 'persona', label: 'Persona Natural' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'ambos', label: 'Persona y Empresa' },
]

const emptyForm = { nombre: '', tipo: 'persona', email: '', telefono: '' }

export function Clientes() {
  const [clientes, setClientes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api
      .get('/clientes/')
      .then((data) => setClientes(data.results ?? data))
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
      await api.post('/clientes/', form)
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.data?.detail || 'No se pudo crear el cliente')
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nuevo cliente'}</Button>}
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
              <Field label="Email">
                <Input type="email" value={form.email} onChange={update('email')} required />
              </Field>
              <Field label="Teléfono">
                <Input value={form.telefono} onChange={update('telefono')} />
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
          rowKey={(c) => c.id}
          emptyMessage="Todavía no hay clientes"
          columns={[
            { key: 'nombre', header: 'Nombre' },
            { key: 'tipo', header: 'Tipo' },
            { key: 'email', header: 'Email' },
            { key: 'telefono', header: 'Teléfono' },
            { key: 'activo', header: 'Estado', render: (c) => (c.activo ? 'Activo' : 'Inactivo') },
          ]}
          rows={clientes}
        />
      )}
    </div>
  )
}
