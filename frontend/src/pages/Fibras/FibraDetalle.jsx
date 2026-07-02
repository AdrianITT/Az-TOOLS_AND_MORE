import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import formStyles from '../shared-form.module.css'
import styles from './Fibras.module.css'

export function FibraDetalle() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const [precios, setPrecios] = useState([])
  const [dividendos, setDividendos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/fibras/catalogo/${ticker}/historico/`),
      api.get(`/fibras/catalogo/${ticker}/dividendos/`),
    ])
      .then(([precios, dividendos]) => {
        setPrecios(precios.map((p) => ({ fecha: p.fecha, precio: Number(p.precio_cierre) })))
        setDividendos(dividendos.map((d) => ({ fecha: d.fecha_pago, monto: Number(d.monto_por_certificado) })))
      })
      .catch(() => setError('No se pudo cargar el histórico de esta FIBRA'))
      .finally(() => setLoading(false))
  }, [ticker])

  return (
    <div>
      <PageHeader
        title={ticker}
        action={
          <Button variant="secondary" onClick={() => navigate('/finanzas/fibras')}>
            Volver al catálogo
          </Button>
        }
      />

      {error && <p className={formStyles.error}>{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          <Card className={styles.chartCard}>
            <strong>Precio de cierre histórico</strong>
            {precios.length === 0 ? (
              <p>Sin precios cargados todavía. Corré el comando de sincronización en el backend.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={precios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="precio" stroke="#3498db" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className={styles.chartCard}>
            <strong>Dividendos pagados por certificado</strong>
            {dividendos.length === 0 ? (
              <p>Sin historial de dividendos todavía.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dividendos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="monto" fill="#2ecc71" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
