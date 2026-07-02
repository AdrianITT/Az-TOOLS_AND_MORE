import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { SimulacionResultado } from './SimulacionResultado'
import formStyles from '../shared-form.module.css'
import styles from './Fibras.module.css'

const hoy = new Date().toISOString().slice(0, 10)
const hace5Anios = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().slice(0, 10)

const emptyForm = {
  tickersSeleccionados: [],
  monto_inicial: '100000',
  fecha_inicio: hace5Anios,
  fecha_fin: hoy,
  reinvertir_dividendos: true,
  usar_aportacion: false,
  aportacion_periodica: '',
  frecuencia_aportacion: 'mensual',
}

export function SimulacionForm() {
  const navigate = useNavigate()
  const [fibras, setFibras] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nombreGuardado, setNombreGuardado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    api.get('/fibras/catalogo/').then((data) => setFibras(data.results ?? data))
  }, [])

  function toggleTicker(ticker) {
    setForm((f) => ({
      ...f,
      tickersSeleccionados: f.tickersSeleccionados.includes(ticker)
        ? f.tickersSeleccionados.filter((t) => t !== ticker)
        : [...f.tickersSeleccionados, ticker],
    }))
  }

  function update(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setForm((f) => ({ ...f, [field]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setGuardado(false)
    if (form.tickersSeleccionados.length === 0) {
      setError('Elegí al menos una FIBRA para simular')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        tickers: form.tickersSeleccionados,
        monto_inicial: form.monto_inicial,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        reinvertir_dividendos: form.reinvertir_dividendos,
      }
      if (form.usar_aportacion && form.aportacion_periodica) {
        payload.aportacion_periodica = form.aportacion_periodica
        payload.frecuencia_aportacion = form.frecuencia_aportacion
      }
      const data = await api.post('/fibras/simular/', payload)
      setResultado(data)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo ejecutar la simulación'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGuardar() {
    setGuardando(true)
    setError('')
    try {
      await api.post('/fibras/simulaciones/', {
        nombre: nombreGuardado || `Simulación ${new Date().toLocaleDateString('es-MX')}`,
        tipo: form.tickersSeleccionados.length > 1 ? 'comparacion' : form.usar_aportacion ? 'dca' : 'simple',
        parametros: resultado.parametros_efectivos,
        resultado,
      })
      setGuardado(true)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la simulación'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Nueva simulación"
        action={
          <Button variant="secondary" onClick={() => navigate('/finanzas/fibras')}>
            Volver al catálogo
          </Button>
        }
      />

      {error && <p className={formStyles.error}>{error}</p>}

      <Card style={{ marginBottom: 20 }}>
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <Field label="FIBRAs a simular (elegí 2 o más para comparar)">
            <div className={styles.tickerCheckboxes}>
              {fibras.map((f) => (
                <label key={f.ticker} className={styles.tickerCheckbox}>
                  <input
                    type="checkbox"
                    checked={form.tickersSeleccionados.includes(f.ticker)}
                    onChange={() => toggleTicker(f.ticker)}
                  />
                  {f.ticker}
                </label>
              ))}
            </div>
          </Field>

          <div className={formStyles.row}>
            <Field label="Monto inicial (MXN)">
              <Input type="number" step="0.01" value={form.monto_inicial} onChange={update('monto_inicial')} required />
            </Field>
            <Field label="Reinversión de dividendos">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.reinvertir_dividendos} onChange={update('reinvertir_dividendos')} />
                Reinvertir dividendos (DRIP)
              </label>
            </Field>
          </div>

          <div className={formStyles.row}>
            <Field label="Fecha de inicio">
              <Input type="date" value={form.fecha_inicio} onChange={update('fecha_inicio')} required />
            </Field>
            <Field label="Fecha de fin">
              <Input type="date" value={form.fecha_fin} onChange={update('fecha_fin')} required />
            </Field>
          </div>

          <Field label="Aportación periódica">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={form.usar_aportacion} onChange={update('usar_aportacion')} />
              Aportar una cantidad fija de forma periódica
            </label>
          </Field>

          {form.usar_aportacion && (
            <div className={formStyles.row}>
              <Field label="Monto de aportación (MXN)">
                <Input type="number" step="0.01" value={form.aportacion_periodica} onChange={update('aportacion_periodica')} />
              </Field>
              <Field label="Frecuencia">
                <Select value={form.frecuencia_aportacion} onChange={update('frecuencia_aportacion')}>
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                </Select>
              </Field>
            </div>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Simulando…' : 'Simular'}
          </Button>
        </form>
      </Card>

      {resultado && (
        <>
          <SimulacionResultado resultado={resultado} />
          <Card style={{ marginBottom: 20 }}>
            <div className={formStyles.row}>
              <Field label="Nombre para guardar (opcional)">
                <Input value={nombreGuardado} onChange={(e) => setNombreGuardado(e.target.value)} placeholder="Ej. FUNO 5 años con reinversión" />
              </Field>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button onClick={handleGuardar} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar en historial'}
                </Button>
              </div>
            </div>
            {guardado && <p className={formStyles.success}>Simulación guardada en el historial</p>}
          </Card>
        </>
      )}
    </div>
  )
}
