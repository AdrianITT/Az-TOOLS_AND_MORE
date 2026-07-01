import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { TrendingUp, TrendingDown, Trash2, Plus } from 'lucide-react'
import styles from '../shared-form.module.css'

const TABS = ['Ingresos', 'Gastos', 'Dashboard']

const emptyIngresoForm = { categoria: '', monto: '', fecha: '', descripcion: '' }
const emptyGastoForm = { categoria: '', monto: '', fecha: '', descripcion: '' }

export function Finanzas() {
  const [activeTab, setActiveTab] = useState('Ingresos')
  const [ingresos, setIngresos] = useState([])
  const [gastos, setGastos] = useState([])
  const [categoriaIngresos, setCategoriaIngresos] = useState([])
  const [categoriaGastos, setCategoriaGastos] = useState([])
  const [dashboard, setDashboard] = useState([])
  const [resumenCategoria, setResumenCategoria] = useState([])

  const [ingresoForm, setIngresoForm] = useState(emptyIngresoForm)
  const [gastoForm, setGastoForm] = useState(emptyGastoForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      api.get('/finanzas/ingresos/'),
      api.get('/finanzas/gastos/'),
      api.get('/finanzas/categorias-ingresos/'),
      api.get('/finanzas/categorias-gastos/'),
      api.get('/finanzas/dashboard/'),
      api.get('/finanzas/resumen-por-categoria/'),
    ])
      .then(([ingresos, gastos, catIngresos, catGastos, dash, resumen]) => {
        setIngresos(ingresos.results ?? ingresos)
        setGastos(gastos.results ?? gastos)
        setCategoriaIngresos(catIngresos.results ?? catIngresos)
        setCategoriaGastos(catGastos.results ?? catGastos)
        setDashboard(dash.results ?? dash)
        setResumenCategoria(resumen.results ?? resumen)
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function updateIngresoForm(field) {
    return (event) => setIngresoForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function updateGastoForm(field) {
    return (event) => setGastoForm((f) => ({ ...f, [field]: event.target.value }))
  }

  async function handleAddIngreso(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/finanzas/ingresos/', ingresoForm)
      setIngresoForm(emptyIngresoForm)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al agregar ingreso'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddGasto(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/finanzas/gastos/', gastoForm)
      setGastoForm(emptyGastoForm)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al agregar gasto'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteIngreso(id) {
    if (!window.confirm('¿Eliminar ingreso?')) return
    try {
      await api.delete(`/finanzas/ingresos/${id}/`)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar'))
    }
  }

  async function handleDeleteGasto(id) {
    if (!window.confirm('¿Eliminar gasto?')) return
    try {
      await api.delete(`/finanzas/gastos/${id}/`)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar'))
    }
  }

  if (loading) return <p>Cargando…</p>

  const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0)
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0)

  return (
    <div>
      <PageHeader title="Finanzas" action={null} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab ? '#3498db' : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              borderRadius: '4px',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* Tab: Ingresos */}
      {activeTab === 'Ingresos' && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h3>Nuevo Ingreso</h3>
            <form className={styles.form} onSubmit={handleAddIngreso}>
              <div className={styles.row}>
                <Field label="Categoría">
                  <Select value={ingresoForm.categoria} onChange={updateIngresoForm('categoria')} required>
                    <option value="">Seleccionar…</option>
                    {categoriaIngresos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Monto">
                  <Input type="number" step="0.01" value={ingresoForm.monto} onChange={updateIngresoForm('monto')} required />
                </Field>
              </div>
              <div className={styles.row}>
                <Field label="Fecha">
                  <Input type="date" value={ingresoForm.fecha} onChange={updateIngresoForm('fecha')} required />
                </Field>
              </div>
              <Field label="Descripción">
                <Input value={ingresoForm.descripcion} onChange={updateIngresoForm('descripcion')} />
              </Field>
              <Button type="submit" disabled={submitting}>
                <Plus size={16} style={{ marginRight: '8px' }} /> Agregar Ingreso
              </Button>
            </form>
          </Card>

          <Card>
            <h3>Total Ingresos: ${totalIngresos.toFixed(2)}</h3>
            <Table
              rowKey={(i) => i.id}
              emptyMessage="Sin ingresos"
              columns={[
                { key: 'fecha', header: 'Fecha' },
                { key: 'categoria_nombre', header: 'Categoría' },
                { key: 'monto', header: 'Monto', render: (i) => `$${i.monto}` },
                { key: 'descripcion', header: 'Descripción' },
                {
                  key: 'acciones',
                  header: '',
                  render: (i) => (
                    <Button variant="danger" onClick={() => handleDeleteIngreso(i.id)}>
                      <Trash2 size={16} />
                    </Button>
                  ),
                },
              ]}
              rows={ingresos}
            />
          </Card>
        </div>
      )}

      {/* Tab: Gastos */}
      {activeTab === 'Gastos' && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h3>Nuevo Gasto</h3>
            <form className={styles.form} onSubmit={handleAddGasto}>
              <div className={styles.row}>
                <Field label="Categoría">
                  <Select value={gastoForm.categoria} onChange={updateGastoForm('categoria')} required>
                    <option value="">Seleccionar…</option>
                    {categoriaGastos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Monto">
                  <Input type="number" step="0.01" value={gastoForm.monto} onChange={updateGastoForm('monto')} required />
                </Field>
              </div>
              <div className={styles.row}>
                <Field label="Fecha">
                  <Input type="date" value={gastoForm.fecha} onChange={updateGastoForm('fecha')} required />
                </Field>
              </div>
              <Field label="Descripción">
                <Input value={gastoForm.descripcion} onChange={updateGastoForm('descripcion')} />
              </Field>
              <Button type="submit" disabled={submitting}>
                <Plus size={16} style={{ marginRight: '8px' }} /> Agregar Gasto
              </Button>
            </form>
          </Card>

          <Card>
            <h3>Total Gastos: ${totalGastos.toFixed(2)}</h3>
            <Table
              rowKey={(g) => g.id}
              emptyMessage="Sin gastos"
              columns={[
                { key: 'fecha', header: 'Fecha' },
                { key: 'categoria_nombre', header: 'Categoría' },
                { key: 'monto', header: 'Monto', render: (g) => `$${g.monto}` },
                { key: 'descripcion', header: 'Descripción' },
                {
                  key: 'acciones',
                  header: '',
                  render: (g) => (
                    <Button variant="danger" onClick={() => handleDeleteGasto(g.id)}>
                      <Trash2 size={16} />
                    </Button>
                  ),
                },
              ]}
              rows={gastos}
            />
          </Card>
        </div>
      )}

      {/* Tab: Dashboard */}
      {activeTab === 'Dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <h4>Total Ingresos</h4>
                <p style={{ fontSize: '24px', color: '#27ae60', fontWeight: 'bold' }}>
                  ${totalIngresos.toFixed(2)}
                </p>
              </div>
            </Card>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <h4>Total Gastos</h4>
                <p style={{ fontSize: '24px', color: '#e74c3c', fontWeight: 'bold' }}>
                  ${totalGastos.toFixed(2)}
                </p>
              </div>
            </Card>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <h4>Ganancia Neta</h4>
                <p style={{ fontSize: '24px', color: totalIngresos - totalGastos >= 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                  ${(totalIngresos - totalGastos).toFixed(2)}
                </p>
              </div>
            </Card>
          </div>

          <Card>
            <h3>Resumen Mensual (últimos 12 meses)</h3>
            <Table
              rowKey={(d, i) => i}
              emptyMessage="Sin datos"
              columns={[
                { key: 'mes', header: 'Mes' },
                { key: 'total_ingresos', header: 'Ingresos', render: (d) => `$${d.total_ingresos}` },
                { key: 'total_gastos', header: 'Gastos', render: (d) => `$${d.total_gastos}` },
                { key: 'ganancia', header: 'Ganancia', render: (d) => `$${d.ganancia}` },
              ]}
              rows={dashboard}
            />
          </Card>

          <Card style={{ marginTop: '20px' }}>
            <h3>Resumen por Categoría (Ingresos)</h3>
            <Table
              rowKey={(r, i) => i}
              emptyMessage="Sin datos"
              columns={[
                { key: 'categoria', header: 'Categoría' },
                { key: 'total', header: 'Total', render: (r) => `$${r.total}` },
                { key: 'porcentaje', header: 'Porcentaje', render: (r) => `${r.porcentaje}%` },
              ]}
              rows={resumenCategoria}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
