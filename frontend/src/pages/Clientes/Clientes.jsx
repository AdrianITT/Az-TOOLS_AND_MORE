import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
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

const emptyForm = {
  nombre: '', tipo: 'persona', email: '', telefono: '',
  nombre_personal: '', cedula: '', nombre_empresa: '', ruc: '', direccion: '',
}

export function Clientes() {
  const [clientes, setClientes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api
      .get('/clientes/')
      .then((data) => setClientes(data.results ?? data))
      .catch(() => setError('No se pudieron cargar los clientes'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function handleNuevo() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowForm((s) => (editingId ? true : !s))
  }

  function handleEditar(cliente) {
    setEditingId(cliente.id)
    setForm({
      nombre: cliente.nombre ?? '',
      tipo: cliente.tipo ?? 'persona',
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      nombre_personal: cliente.nombre_personal ?? '',
      cedula: cliente.cedula ?? '',
      nombre_empresa: cliente.nombre_empresa ?? '',
      ruc: cliente.ruc ?? '',
      direccion: cliente.direccion ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function handleCancel() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowForm(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/clientes/${editingId}/`, form)
      } else {
        await api.post('/clientes/', form)
      }
      handleCancel()
      load()
    } catch (err) {
      setError(getErrorMessage(err, editingId ? 'No se pudo actualizar el cliente' : 'No se pudo crear el cliente'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        action={<Button onClick={handleNuevo}>{showForm && !editingId ? 'Cancelar' : 'Nuevo cliente'}</Button>}
      />

      {error && !showForm && <p className={styles.error}>{error}</p>}

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
            <div className={styles.row}>
              <Field label="Nombre personal">
                <Input value={form.nombre_personal} onChange={update('nombre_personal')} />
              </Field>
              <Field label="Cédula">
                <Input value={form.cedula} onChange={update('cedula')} />
              </Field>
            </div>
            <div className={styles.row}>
              <Field label="Nombre de empresa">
                <Input value={form.nombre_empresa} onChange={update('nombre_empresa')} />
              </Field>
              <Field label="RUC">
                <Input value={form.ruc} onChange={update('ruc')} />
              </Field>
            </div>
            <Field label="Dirección">
              <Input value={form.direccion} onChange={update('direccion')} />
            </Field>
            {error && <p className={styles.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </Button>
              )}
            </div>
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
            {
              key: 'acciones',
              header: '',
              render: (c) => (
                <Button variant="secondary" onClick={() => handleEditar(c)}>
                  Editar
                </Button>
              ),
            },
          ]}
          rows={clientes}
        />
      )}
    </div>
  )
}
