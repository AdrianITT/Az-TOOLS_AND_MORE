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

function formatFechaLarga(fechaISO) {
  if (!fechaISO) return ''
  const [year, month, day] = fechaISO.split('-')
  return `${day}/${month}/${year}`
}

function describirPeriodo(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return ''
  const inicio = new Date(`${fechaInicio}T00:00:00`)
  const fin = new Date(`${fechaFin}T00:00:00`)
  const dias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24))
  if (dias <= 0) return ''
  const anios = Math.floor(dias / 365)
  const mesesRestantes = Math.round((dias % 365) / 30)
  if (anios === 0) return `${mesesRestantes} mes${mesesRestantes === 1 ? '' : 'es'}`
  if (mesesRestantes === 0) return `${anios} año${anios === 1 ? '' : 's'}`
  return `${anios} año${anios === 1 ? '' : 's'} y ${mesesRestantes} mes${mesesRestantes === 1 ? '' : 'es'}`
}

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
    if (form.fecha_inicio >= form.fecha_fin) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin')
      return
    }
    if (form.fecha_fin > hoy) {
      setError('La fecha de fin no puede ser una fecha futura')
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

  const errorRangoFechas =
    form.fecha_inicio && form.fecha_fin && form.fecha_inicio >= form.fecha_fin
      ? 'Debe ser posterior a la fecha de inicio'
      : ''

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
        <p style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: 14 }}>
          Esta simulación es un <strong>backtest histórico</strong>: calcula qué hubiera pasado si invertías el monto
          indicado en la <strong>fecha de inicio</strong>, usando los precios y dividendos reales de cada FIBRA, y
          evalúa el resultado hasta la <strong>fecha de fin</strong>. No es una proyección de rendimientos futuros.
        </p>
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
            <Field label="Fecha de inicio" hint="Día en el que se realiza la inversión inicial (histórico).">
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={update('fecha_inicio')}
                max={form.fecha_fin || hoy}
                title="Fecha en la que 'entrás' a invertir el monto inicial. La simulación usa los precios y dividendos reales desde este día."
                required
              />
            </Field>
            <Field
              label="Fecha de fin"
              hint="Día hasta el cual se calcula el resultado de la inversión."
              error={errorRangoFechas}
            >
              <Input
                type="date"
                value={form.fecha_fin}
                onChange={update('fecha_fin')}
                min={form.fecha_inicio}
                max={hoy}
                title="Fecha de corte para calcular el valor final, el retorno y los dividendos. Por defecto, hoy."
                required
              />
            </Field>
          </div>

          {form.fecha_inicio && form.fecha_fin && form.fecha_inicio < form.fecha_fin && (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: -8 }}>
              Se simulará una inversión desde el <strong>{formatFechaLarga(form.fecha_inicio)}</strong> hasta el{' '}
              <strong>{formatFechaLarga(form.fecha_fin)}</strong> (
              {describirPeriodo(form.fecha_inicio, form.fecha_fin)}).
            </p>
          )}

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

          <Button type="submit" disabled={submitting || Boolean(errorRangoFechas)}>
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
