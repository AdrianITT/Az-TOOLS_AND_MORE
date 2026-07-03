import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import styles from './Onboarding.module.css'

const PLANES = [
  { value: 'basico', label: 'Básico (3 usuarios, 50 clientes)' },
  { value: 'profesional', label: 'Profesional (10 usuarios, 500 clientes)' },
  { value: 'empresa', label: 'Empresa (ilimitado)' },
]

const initialForm = {
  nombre: '',
  email: '',
  ruc: '',
  pais: 'Mexico',
  plan: 'basico',
  username: '',
  password: '',
  first_name: '',
  last_name: '',
}

export function CrearOrganizacion() {
  const { setUserData } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Pendiente en el backend: POST /api/organizaciones/registro/
      const data = await api.post('/organizaciones/registro/', form)
      localStorage.setItem('token', data.token)
      setUserData(data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la organización. Revisá los datos.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Card>
        <h1>Crear organización</h1>
        <p>Registrá tu empresa y tu cuenta de administrador.</p>
        <form className={styles.form} onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <Field label="Nombre de la organización">
            <Input value={form.nombre} onChange={update('nombre')} required />
          </Field>
          <div className={styles.row}>
            <Field label="Email de la organización">
              <Input type="email" value={form.email} onChange={update('email')} required />
            </Field>
            <Field label="RUC / identificación fiscal">
              <Input value={form.ruc} onChange={update('ruc')} />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="País">
              <Input value={form.pais} onChange={update('pais')} />
            </Field>
            <Field label="Plan">
              <Select value={form.plan} onChange={update('plan')}>
                {PLANES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--color-border)' }} />
          <h2>Tu cuenta de administrador</h2>
          <div className={styles.row}>
            <Field label="Nombre">
              <Input value={form.first_name} onChange={update('first_name')} />
            </Field>
            <Field label="Apellido">
              <Input value={form.last_name} onChange={update('last_name')} />
            </Field>
          </div>
          <Field label="Usuario">
            <Input value={form.username} onChange={update('username')} required />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={form.password} onChange={update('password')} required />
          </Field>

          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando…' : 'Crear organización'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
