import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Calculator, History } from 'lucide-react'
import { api } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import formStyles from '../shared-form.module.css'

export function FibrasCatalogo() {
  const navigate = useNavigate()
  const [fibras, setFibras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/fibras/catalogo/')
      .then((data) => setFibras(data.results ?? data))
      .catch(() => setError('No se pudo cargar el catálogo de FIBRAs'))
      .finally(() => setLoading(false))
  }, [])

  function esDatoDesactualizado(fibra) {
    if (!fibra.ultima_actualizacion) return true
    const dias = (Date.now() - new Date(fibra.ultima_actualizacion).getTime()) / 86400000
    return dias > 3
  }

  return (
    <div>
      <PageHeader
        title="Inversiones en FIBRAs"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate('/finanzas/fibras/historial')}>
              <History size={16} /> Historial
            </Button>
            <Button onClick={() => navigate('/finanzas/fibras/simular')}>
              <Calculator size={16} /> Nueva simulación
            </Button>
          </div>
        }
      />

      {error && <p className={formStyles.error}>{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <Card>
          <Table
            rowKey={(f) => f.id}
            emptyMessage="Todavía no hay FIBRAs en el catálogo"
            columns={[
              { key: 'ticker', header: 'Ticker' },
              { key: 'nombre', header: 'Nombre' },
              { key: 'sector', header: 'Sector' },
              {
                key: 'ultima_actualizacion',
                header: 'Datos',
                render: (f) =>
                  esDatoDesactualizado(f) ? (
                    <span style={{ color: 'var(--color-danger)' }}>Desactualizado</span>
                  ) : (
                    <span style={{ color: 'var(--color-success)' }}>Al día</span>
                  ),
              },
              {
                key: 'acciones',
                header: '',
                render: (f) => (
                  <Button variant="secondary" onClick={() => navigate(`/finanzas/fibras/${f.ticker}`)}>
                    <LineChart size={16} /> Ver histórico
                  </Button>
                ),
              },
            ]}
            rows={fibras}
          />
        </Card>
      )}
    </div>
  )
}
