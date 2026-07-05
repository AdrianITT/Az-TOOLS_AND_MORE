import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import formStyles from '../shared-form.module.css'
import styles from './Cotizaciones.module.css'

const ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'expirada', label: 'Expirada' },
]

export function Cotizaciones() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cotizaciones, setCotizaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [duplicandoId, setDuplicandoId] = useState(null)

  useEffect(() => {
    api.get('/clientes/').then((data) => setClientes(data.results ?? data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api
        .get('/cotizaciones/', { search, estado, cliente: clienteFiltro })
        .then((data) => setCotizaciones(data.results ?? data))
        .catch(() => setError('No se pudieron cargar las cotizaciones'))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [search, estado, clienteFiltro])

  const clientesById = useMemo(() => {
    const map = {}
    clientes.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [clientes])

  async function handleDelete(id) {
    try {
      await api.delete(`/cotizaciones/${id}/`)
      setConfirmDeleteId(null)
      setCotizaciones((current) => current.filter((c) => c.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la cotización'))
    }
  }

  async function handleDuplicar(id) {
    setError('')
    setDuplicandoId(id)
    try {
      const copia = await api.post(`/cotizaciones/${id}/duplicar/`)
      navigate(`/cotizaciones/${copia.id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo duplicar la cotización'))
    } finally {
      setDuplicandoId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        action={<Button onClick={() => navigate('/cotizaciones/nueva')}>Nueva cotización</Button>}
      />

      <Card style={{ marginBottom: 20 }}>
        <div className={styles.toolbar}>
          <Field label="Buscar">
            <Input
              placeholder="Número o cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field label="Estado">
            <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}>
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {error && <p className={formStyles.error}>{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <Table
          rowKey={(c) => c.id}
          emptyMessage="Todavía no hay cotizaciones"
          columns={[
            { key: 'numero', header: 'Número' },
            { key: 'cliente', header: 'Cliente', render: (c) => clientesById[c.cliente]?.nombre ?? '—' },
            { key: 'total', header: 'Total', render: (c) => `$${c.total}` },
            {
              key: 'estado',
              header: 'Estado',
              render: (c) => ESTADOS.find((e) => e.value === c.estado)?.label ?? c.estado,
            },
            { key: 'fecha_vencimiento', header: 'Vence' },
            {
              key: 'acciones',
              header: '',
              render: (c) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => navigate(`/cotizaciones/${c.id}`)}>
                    Ver / Editar
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={duplicandoId === c.id}
                    onClick={() => handleDuplicar(c.id)}
                  >
                    {duplicandoId === c.id ? 'Duplicando…' : 'Duplicar'}
                  </Button>
                  {user?.puede_eliminar_cotizaciones && (
                    <Button variant="danger" onClick={() => setConfirmDeleteId(c.id)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={cotizaciones}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar cotización"
        message="Esta acción no se puede deshacer. ¿Querés eliminar esta cotización?"
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
