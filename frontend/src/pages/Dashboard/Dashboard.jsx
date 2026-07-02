import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Card } from '../../components/ui/Card'
import styles from './Dashboard.module.css'

const ESTADO_LABELS = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
}

function formatMoneda(valor) {
  return `$${Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function Dashboard() {
  const { user } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [finanzas, setFinanzas] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.puede_ver_reportes) return
    api
      .get('/reportes/resumen/')
      .then(setResumen)
      .catch(() => setError('No se pudo cargar el resumen'))
    api
      .get('/finanzas/dashboard/')
      .then(setFinanzas)
      .catch(() => {})
  }, [user])

  const porEstadoData = resumen
    ? Object.entries(resumen.por_estado).map(([estado, data]) => ({
        estado: ESTADO_LABELS[estado] || estado,
        cantidad: data.cantidad,
        total: Number(data.total),
      }))
    : []

  return (
    <div>
      <h1>Resumen</h1>

      {!user?.puede_ver_reportes && (
        <p className={styles.hint}>Tu rol no tiene acceso a reportes.</p>
      )}
      {error && <p className={styles.hint}>{error}</p>}

      {resumen && (
        <>
          <div className={styles.grid}>
            <Card>
              <span className={styles.label}>Cotizaciones totales</span>
              <span className={styles.value}>{resumen.total_cotizaciones}</span>
            </Card>
            <Card>
              <span className={styles.label}>Total facturado</span>
              <span className={styles.value}>${resumen.total_facturado}</span>
            </Card>
            <Card>
              <span className={styles.label}>Clientes activos</span>
              <span className={styles.value}>{resumen.clientes_activos}</span>
            </Card>
          </div>

          <h2 className={styles.subtitle}>Cotizaciones por estado</h2>
          <div className={styles.grid}>
            {Object.entries(resumen.por_estado).map(([estado, data]) => (
              <Card key={estado}>
                <span className={styles.label}>{ESTADO_LABELS[estado] || estado}</span>
                <span className={styles.value}>{data.cantidad}</span>
                <span className={styles.hint}>${data.total}</span>
              </Card>
            ))}
          </div>

          {porEstadoData.length > 0 && (
            <Card className={styles.chartCard}>
              <strong>Total facturado por estado</strong>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porEstadoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="estado" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatMoneda(value)} />
                  <Bar dataKey="total" name="Total" fill="#3498db" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {finanzas && finanzas.length > 0 && (
            <>
              <h2 className={styles.subtitle}>Finanzas — últimos 12 meses</h2>
              <Card className={styles.chartCard}>
                <strong>Ingresos, gastos y ganancia neta por mes</strong>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={finanzas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatMoneda(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="total_ingresos" name="Ingresos" stroke="#2ecc71" dot={false} />
                    <Line type="monotone" dataKey="total_gastos" name="Gastos" stroke="#e74c3c" dot={false} />
                    <Line type="monotone" dataKey="ganancia" name="Ganancia neta" stroke="#3498db" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
