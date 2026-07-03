import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import styles from '../shared-form.module.css'

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'contador', label: 'Contador' },
  { value: 'visualizador', label: 'Solo visualización' },
]

const emptyForm = { email: '', rol: 'vendedor' }

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    Promise.all([
      api.get('/usuarios/').then((data) => setUsuarios(data.results ?? data)),
      api.get('/invitaciones/', { estado: 'pendiente' }).then((data) => setInvitaciones(data.results ?? data)),
    ])
      .catch(() => setError('No se pudieron cargar los usuarios'))
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
      await api.post('/invitaciones/', form)
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar la invitación'))
    }
  }

  async function cancelarInvitacion(invitacion) {
    setError('')
    try {
      await api.post(`/invitaciones/${invitacion.id}/cancelar/`)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cancelar la invitación'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Invitar usuario'}</Button>}
      />

      {error && <p className={styles.error}>{error}</p>}

      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={update('email')} required />
              </Field>
              <Field label="Rol">
                <Select value={form.rol} onChange={update('rol')}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit">Enviar invitación</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          <Table
            rowKey={(u) => u.id}
            emptyMessage="Todavía no hay usuarios"
            columns={[
              { key: 'username', header: 'Usuario' },
              { key: 'email', header: 'Email' },
              { key: 'rol', header: 'Rol' },
              { key: 'activo', header: 'Estado', render: (u) => (u.activo ? 'Activo' : 'Inactivo') },
            ]}
            rows={usuarios}
          />

          <h2 style={{ marginTop: 32, fontSize: 18 }}>Invitaciones pendientes</h2>
          <Table
            rowKey={(i) => i.id}
            emptyMessage="No hay invitaciones pendientes"
            columns={[
              { key: 'email', header: 'Email' },
              { key: 'rol', header: 'Rol' },
              { key: 'expira', header: 'Expira' },
              {
                key: 'acciones',
                header: '',
                render: (i) => (
                  <Button variant="secondary" onClick={() => cancelarInvitacion(i)}>
                    Cancelar
                  </Button>
                ),
              },
            ]}
            rows={invitaciones}
          />
        </>
      )}
    </div>
  )
}
