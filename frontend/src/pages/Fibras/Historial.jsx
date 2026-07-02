import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SimulacionResultado } from './SimulacionResultado'
import formStyles from '../shared-form.module.css'

export function Historial() {
  const navigate = useNavigate()
  const [simulaciones, setSimulaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    api
      .get('/fibras/simulaciones/')
      .then((data) => setSimulaciones(data.results ?? data))
      .catch(() => setError('No se pudo cargar el historial'))
      .finally(() => setLoading(false))
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/fibras/simulaciones/${id}/`)
      setConfirmDeleteId(null)
      setSimulaciones((current) => current.filter((s) => s.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la simulación'))
    }
  }

  const expandida = simulaciones.find((s) => s.id === expandedId)

  return (
    <div>
      <PageHeader
        title="Historial de simulaciones"
        action={
          <Button variant="secondary" onClick={() => navigate('/finanzas/fibras')}>
            Volver al catálogo
          </Button>
        }
      />

      {error && <p className={formStyles.error}>{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : simulaciones.length === 0 ? (
        <EmptyState
          icon={History}
          title="Todavía no guardaste ninguna simulación"
          description="Corré una simulación y guardala para verla acá."
          action={<Button onClick={() => navigate('/finanzas/fibras/simular')}>Nueva simulación</Button>}
        />
      ) : (
        <Card>
          <Table
            rowKey={(s) => s.id}
            emptyMessage="Sin simulaciones guardadas"
            columns={[
              { key: 'nombre', header: 'Nombre' },
              { key: 'tipo', header: 'Tipo' },
              { key: 'creado', header: 'Fecha', render: (s) => new Date(s.creado).toLocaleString('es-MX') },
              {
                key: 'acciones',
                header: '',
                render: (s) => (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button variant="secondary" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                      {expandedId === s.id ? 'Ocultar' : 'Ver detalle'}
                    </Button>
                    <Button variant="danger" onClick={() => setConfirmDeleteId(s.id)}>
                      Eliminar
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={simulaciones}
          />
        </Card>
      )}

      {expandida && (
        <div style={{ marginTop: 20 }}>
          <SimulacionResultado resultado={expandida.resultado} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar simulación"
        message="Esta acción no se puede deshacer. ¿Querés eliminar esta simulación del historial?"
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
