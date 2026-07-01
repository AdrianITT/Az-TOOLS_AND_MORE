import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Trash2, Plus, Wallet } from 'lucide-react'
import styles from '../shared-form.module.css'

const TABS = ['Ingresos', 'Gastos', 'Dashboard']
const NUEVA_CATEGORIA = '__nueva__'

const emptyIngresoForm = { categoria: '', monto: '', fecha: '', descripcion: '' }
const emptyGastoForm = { categoria: '', monto: '', fecha: '', descripcion: '' }

function CategoriaQuickForm({ onSubmit, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#3498db')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ nombre, color })
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la categoría'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} style={{ marginTop: 4 }}>
      <div className={styles.row}>
        <Field label="Nombre de la categoría">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        </Field>
        <Field label="Color">
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <Button type="submit" disabled={submitting}>
          Crear categoría
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function CategoriasManager({ categorias, onDeleteRequest }) {
  return (
    <Table
      rowKey={(c) => c.id}
      emptyMessage="Sin categorías"
      columns={[
        {
          key: 'nombre',
          header: 'Categoría',
          render: (c) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: c.color,
                }}
              />
              {c.nombre}
            </span>
          ),
        },
        {
          key: 'acciones',
          header: '',
          render: (c) => (
            <Button variant="danger" onClick={() => onDeleteRequest(c)}>
              <Trash2 size={16} />
            </Button>
          ),
        },
      ]}
      rows={categorias}
    />
  )
}

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
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [creatingCategoriaIngreso, setCreatingCategoriaIngreso] = useState(false)
  const [creatingCategoriaGasto, setCreatingCategoriaGasto] = useState(false)
  const [showCategoriasIngreso, setShowCategoriasIngreso] = useState(false)
  const [showCategoriasGasto, setShowCategoriasGasto] = useState(false)
  const [confirmDeleteCategoria, setConfirmDeleteCategoria] = useState(null)
  const [confirmDeleteIngreso, setConfirmDeleteIngreso] = useState(null)
  const [confirmDeleteGasto, setConfirmDeleteGasto] = useState(null)

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

  function flashSuccess(message) {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 2500)
  }

  function updateIngresoForm(field) {
    return (event) => {
      const value = event.target.value
      if (field === 'categoria' && value === NUEVA_CATEGORIA) {
        setCreatingCategoriaIngreso(true)
        return
      }
      setIngresoForm((f) => ({ ...f, [field]: value }))
    }
  }

  function updateGastoForm(field) {
    return (event) => {
      const value = event.target.value
      if (field === 'categoria' && value === NUEVA_CATEGORIA) {
        setCreatingCategoriaGasto(true)
        return
      }
      setGastoForm((f) => ({ ...f, [field]: value }))
    }
  }

  async function handleCrearCategoriaIngreso({ nombre, color }) {
    const nueva = await api.post('/finanzas/categorias-ingresos/', { nombre, color })
    setCategoriaIngresos((cats) => [...cats, nueva])
    setIngresoForm((f) => ({ ...f, categoria: nueva.id }))
    setCreatingCategoriaIngreso(false)
    flashSuccess('Categoría de ingresos creada')
  }

  async function handleCrearCategoriaGasto({ nombre, color }) {
    const nueva = await api.post('/finanzas/categorias-gastos/', { nombre, color })
    setCategoriaGastos((cats) => [...cats, nueva])
    setGastoForm((f) => ({ ...f, categoria: nueva.id }))
    setCreatingCategoriaGasto(false)
    flashSuccess('Categoría de gastos creada')
  }

  async function handleDeleteCategoria() {
    const { tipo, categoria } = confirmDeleteCategoria
    try {
      await api.delete(`/finanzas/categorias-${tipo}/${categoria.id}/`)
      if (tipo === 'ingresos') setCategoriaIngresos((cats) => cats.filter((c) => c.id !== categoria.id))
      else setCategoriaGastos((cats) => cats.filter((c) => c.id !== categoria.id))
      setConfirmDeleteCategoria(null)
      flashSuccess('Categoría eliminada')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la categoría (puede estar en uso)'))
      setConfirmDeleteCategoria(null)
    }
  }

  async function handleAddIngreso(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/finanzas/ingresos/', ingresoForm)
      setIngresoForm(emptyIngresoForm)
      load()
      flashSuccess('Ingreso agregado')
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
      flashSuccess('Gasto agregado')
    } catch (err) {
      setError(getErrorMessage(err, 'Error al agregar gasto'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteIngreso(id) {
    try {
      await api.delete(`/finanzas/ingresos/${id}/`)
      setConfirmDeleteIngreso(null)
      load()
      flashSuccess('Ingreso eliminado')
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar'))
    }
  }

  async function handleDeleteGasto(id) {
    try {
      await api.delete(`/finanzas/gastos/${id}/`)
      setConfirmDeleteGasto(null)
      load()
      flashSuccess('Gasto eliminado')
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
      {successMessage && <p className={styles.success}>{successMessage}</p>}

      {/* Tab: Ingresos */}
      {activeTab === 'Ingresos' && (
        <div>
          {categoriaIngresos.length === 0 && !creatingCategoriaIngreso ? (
            <Card style={{ marginBottom: 20 }}>
              <EmptyState
                icon={Wallet}
                title="Todavía no tenés categorías de ingresos"
                description="Creá una categoría (ej. Ventas, Servicios) para poder registrar tu primer ingreso."
                action={<Button onClick={() => setCreatingCategoriaIngreso(true)}>Crear categoría</Button>}
              />
            </Card>
          ) : creatingCategoriaIngreso ? (
            <Card style={{ marginBottom: 20 }}>
              <h3>Nueva categoría de ingresos</h3>
              <CategoriaQuickForm
                onSubmit={handleCrearCategoriaIngreso}
                onCancel={() => setCreatingCategoriaIngreso(false)}
              />
            </Card>
          ) : (
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
                      <option value={NUEVA_CATEGORIA}>+ Nueva categoría</option>
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
          )}

          {categoriaIngresos.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Categorías de ingresos</strong>
                <Button variant="secondary" onClick={() => setShowCategoriasIngreso((s) => !s)}>
                  {showCategoriasIngreso ? 'Ocultar' : 'Gestionar categorías'}
                </Button>
              </div>
              {showCategoriasIngreso && (
                <div style={{ marginTop: 12 }}>
                  <CategoriasManager
                    categorias={categoriaIngresos}
                    onDeleteRequest={(categoria) => setConfirmDeleteCategoria({ tipo: 'ingresos', categoria })}
                  />
                </div>
              )}
            </Card>
          )}

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
                    <Button variant="danger" onClick={() => setConfirmDeleteIngreso(i.id)}>
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
          {categoriaGastos.length === 0 && !creatingCategoriaGasto ? (
            <Card style={{ marginBottom: 20 }}>
              <EmptyState
                icon={Wallet}
                title="Todavía no tenés categorías de gastos"
                description="Creá una categoría (ej. Operativo, Marketing) para poder registrar tu primer gasto."
                action={<Button onClick={() => setCreatingCategoriaGasto(true)}>Crear categoría</Button>}
              />
            </Card>
          ) : creatingCategoriaGasto ? (
            <Card style={{ marginBottom: 20 }}>
              <h3>Nueva categoría de gastos</h3>
              <CategoriaQuickForm onSubmit={handleCrearCategoriaGasto} onCancel={() => setCreatingCategoriaGasto(false)} />
            </Card>
          ) : (
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
                      <option value={NUEVA_CATEGORIA}>+ Nueva categoría</option>
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
          )}

          {categoriaGastos.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Categorías de gastos</strong>
                <Button variant="secondary" onClick={() => setShowCategoriasGasto((s) => !s)}>
                  {showCategoriasGasto ? 'Ocultar' : 'Gestionar categorías'}
                </Button>
              </div>
              {showCategoriasGasto && (
                <div style={{ marginTop: 12 }}>
                  <CategoriasManager
                    categorias={categoriaGastos}
                    onDeleteRequest={(categoria) => setConfirmDeleteCategoria({ tipo: 'gastos', categoria })}
                  />
                </div>
              )}
            </Card>
          )}

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
                    <Button variant="danger" onClick={() => setConfirmDeleteGasto(g.id)}>
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

      <ConfirmDialog
        open={confirmDeleteCategoria !== null}
        title="Eliminar categoría"
        message="Si hay ingresos o gastos usando esta categoría, no se podrá eliminar."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteCategoria}
        onCancel={() => setConfirmDeleteCategoria(null)}
      />

      <ConfirmDialog
        open={confirmDeleteIngreso !== null}
        title="Eliminar ingreso"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDeleteIngreso(confirmDeleteIngreso)}
        onCancel={() => setConfirmDeleteIngreso(null)}
      />

      <ConfirmDialog
        open={confirmDeleteGasto !== null}
        title="Eliminar gasto"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDeleteGasto(confirmDeleteGasto)}
        onCancel={() => setConfirmDeleteGasto(null)}
      />
    </div>
  )
}
