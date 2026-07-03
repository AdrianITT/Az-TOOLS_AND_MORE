import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Card } from '../../components/ui/Card'
import { Field, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import styles from './AceptarInvitacion.module.css'

export function AceptarInvitacion() {
  const { token } = useParams()
  const { setUserData } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '' })
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
      const data = await api.post('/invitaciones/aceptar/', { ...form, token })
      localStorage.setItem('token', data.token)
      setUserData(data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo aceptar la invitación'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1>Completá tu cuenta</h1>
        <p>Creá tu usuario para unirte a la organización que te invitó.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
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
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
