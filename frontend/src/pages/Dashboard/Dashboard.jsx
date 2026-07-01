import { useEffect, useState } from 'react'
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

export function Dashboard() {
  const { user } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.puede_ver_reportes) return
    api
      .get('/reportes/resumen/')
      .then(setResumen)
      .catch(() => setError('No se pudo cargar el resumen'))
  }, [user])

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
        </>
      )}
    </div>
  )
}
