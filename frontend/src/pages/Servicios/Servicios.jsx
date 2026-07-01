import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import formStyles from '../shared-form.module.css'
import styles from './Servicios.module.css'

export function Servicios() {
  const navigate = useNavigate()
  const [servicios, setServicios] = useState([])
  const [atributos, setAtributos] = useState([])
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [activoFiltro, setActivoFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    api.get('/atributos-plantilla/').then((data) => setAtributos(data.results ?? data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api
        .get('/servicios/', { search, categoria: categoriaFiltro, activo: activoFiltro })
        .then((data) => setServicios(data.results ?? data))
        .catch(() => setError('No se pudieron cargar los servicios'))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [search, categoriaFiltro, activoFiltro])

  const atributosById = useMemo(() => {
    const map = {}
    atributos.forEach((a) => {
      map[a.id] = a
    })
    return map
  }, [atributos])

  const categoriasExistentes = useMemo(() => {
    const set = new Set()
    atributos.forEach((a) => set.add(a.categoria))
    servicios.forEach((s) => s.categoria && set.add(s.categoria))
    return Array.from(set).sort()
  }, [atributos, servicios])

  async function handleDelete(id) {
    try {
      await api.delete(`/servicios/${id}/`)
      setConfirmDeleteId(null)
      setServicios((current) => current.filter((s) => s.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el servicio'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Servicios"
        action={<Button onClick={() => navigate('/servicios/nuevo')}>Nuevo servicio</Button>}
      />

      <Card style={{ marginBottom: 20 }}>
        <div className={styles.toolbar}>
          <Field label="Buscar">
            <Input placeholder="Nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <Select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
              <option value="">Todas</option>
              {categoriasExistentes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={activoFiltro} onChange={(e) => setActivoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          </Field>
        </div>
      </Card>

      {error && <p className={formStyles.error}>{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <Table
          rowKey={(s) => s.id}
          emptyMessage="Todavía no hay servicios"
          columns={[
            { key: 'nombre', header: 'Nombre' },
            { key: 'categoria', header: 'Categoría' },
            { key: 'precio_base', header: 'Precio base', render: (s) => `$${s.precio_base}` },
            { key: 'activo', header: 'Estado', render: (s) => (s.activo ? 'Activo' : 'Inactivo') },
            {
              key: 'valores',
              header: 'Atributos',
              render: (s) =>
                (s.valores ?? [])
                  .map((v) => `${atributosById[v.atributo]?.nombre ?? v.atributo}: ${v.valor}`)
                  .join(', '),
            },
            {
              key: 'acciones',
              header: '',
              render: (s) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => navigate(`/servicios/${s.id}`)}>
                    Ver / Editar
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDeleteId(s.id)}>
                    Eliminar
                  </Button>
                </div>
              ),
            },
          ]}
          rows={servicios}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar servicio"
        message="Esta acción no se puede deshacer. ¿Querés eliminar este servicio?"
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
