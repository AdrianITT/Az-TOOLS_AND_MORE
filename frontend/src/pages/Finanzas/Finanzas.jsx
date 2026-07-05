import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Trash2, Plus, Wallet, Eye, CreditCard, AlertTriangle, CheckSquare, Square } from 'lucide-react'
import styles from '../shared-form.module.css'

const CATEGORIA_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']

function formatMoneda(value) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function formatFechaCorta(fechaISO) {
  if (!fechaISO) return ''
  const [year, month, day] = fechaISO.split('-')
  return `${day}/${month}/${year}`
}

const TABS = ['Ingresos', 'Gastos', 'Deudas', 'Dashboard']
const NUEVA_CATEGORIA = '__nueva__'

const emptyIngresoForm = { categoria: '', monto: '', fecha: '', descripcion: '' }
const emptyGastoForm = { categoria: '', monto: '', fecha: '', descripcion: '' }
const emptyDeudaForm = {
  categoria: '',
  acreedor: '',
  monto_original: '',
  fecha_inicio: '',
  fecha_vencimiento: '',
  tasa_interes_anual: '',
  pago_periodico: '',
  dia_pago: '',
  notas: '',
}
const emptyPagoForm = { monto: '', fecha: '', notas: '', gastos_cubiertos_ids: [] }

const TIPO_AMORTIZACION_OPTIONS = [
  { value: 'revolvente', label: 'Revolvente (tarjeta, línea de crédito)' },
  { value: 'cuotas_fijas', label: 'Cuotas fijas (préstamo, hipoteca)' },
  { value: 'cuenta_por_pagar', label: 'Cuenta por pagar (proveedor, impuesto)' },
]

const ESTADO_LABELS = { activa: 'Activa', pagada: 'Pagada', vencida: 'Vencida' }
const ESTADO_COLORS = { activa: '#27ae60', pagada: '#7f8c8d', vencida: '#e74c3c' }

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

function CategoriaDeudaQuickForm({ onSubmit, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#e74c3c')
  const [tipoAmortizacion, setTipoAmortizacion] = useState('cuotas_fijas')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ nombre, color, tipo_amortizacion: tipoAmortizacion })
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
      <Field label="Tipo de amortización">
        <Select value={tipoAmortizacion} onChange={(e) => setTipoAmortizacion(e.target.value)}>
          {TIPO_AMORTIZACION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>
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

function CategoriaBubble({ nombre, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 10px', borderRadius: 12,
      background: color + '22', border: `1px solid ${color}`, color,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {nombre}
    </span>
  )
}

export function Finanzas() {
  const [activeTab, setActiveTab] = useState('Ingresos')

  // Ingresos / Gastos state
  const [ingresos, setIngresos] = useState([])
  const [gastos, setGastos] = useState([])
  const [categoriaIngresos, setCategoriaIngresos] = useState([])
  const [categoriaGastos, setCategoriaGastos] = useState([])
  const [dashboard, setDashboard] = useState([])
  const [resumenCategoria, setResumenCategoria] = useState([])
  const [gastosPorDia, setGastosPorDia] = useState([])
  const [resumenGastosCategoria, setResumenGastosCategoria] = useState([])

  const [detalleMes, setDetalleMes] = useState(null)
  const [detalleMovimientos, setDetalleMovimientos] = useState([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState('')

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

  // Deudas state
  const [categoriaDeudas, setCategoriaDeudas] = useState([])
  const [deudas, setDeudas] = useState([])
  const [deudaResumen, setDeudaResumen] = useState({ total_deuda: 0, por_categoria: [] })
  const [proximosVencimientos, setProximosVencimientos] = useState([])
  const [deudaForm, setDeudaForm] = useState(emptyDeudaForm)
  const [creatingCategoriaDeuda, setCreatingCategoriaDeuda] = useState(false)
  const [showCategoriasDeuda, setShowCategoriasDeuda] = useState(false)
  const [confirmDeleteDeuda, setConfirmDeleteDeuda] = useState(null)
  const [confirmDeleteCategoriaDeuda, setConfirmDeleteCategoriaDeuda] = useState(null)

  // Pago modal state
  const [pagoModal, setPagoModal] = useState(null)
  const [pagoForm, setPagoForm] = useState(emptyPagoForm)
  const [pagoHistorial, setPagoHistorial] = useState([])
  const [gastosDisponibles, setGastosDisponibles] = useState([])
  const [submittingPago, setSubmittingPago] = useState(false)
  const [errorPago, setErrorPago] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      api.get('/finanzas/ingresos/'),
      api.get('/finanzas/gastos/'),
      api.get('/finanzas/categorias-ingresos/'),
      api.get('/finanzas/categorias-gastos/'),
      api.get('/finanzas/dashboard/'),
      api.get('/finanzas/resumen-por-categoria/'),
      api.get('/finanzas/gastos-por-dia/'),
      api.get('/finanzas/resumen-por-categoria/', { tipo: 'gastos' }),
      api.get('/finanzas/categorias-deudas/'),
      api.get('/finanzas/deudas/'),
      api.get('/finanzas/deudas/resumen/'),
      api.get('/finanzas/deudas/proximos-vencimientos/'),
    ])
      .then(([ingresosData, gastosData, catIngresos, catGastos, dash, resumen, porDia, resumenGastos, catDeudas, deudasData, resDeudas, proxVenc]) => {
        setIngresos(ingresosData.results ?? ingresosData)
        setGastos(gastosData.results ?? gastosData)
        setCategoriaIngresos(catIngresos.results ?? catIngresos)
        setCategoriaGastos(catGastos.results ?? catGastos)
        setDashboard(dash.results ?? dash)
        setResumenCategoria(resumen.results ?? resumen)
        setGastosPorDia(porDia.results ?? porDia)
        setResumenGastosCategoria(resumenGastos.results ?? resumenGastos)
        setCategoriaDeudas(catDeudas.results ?? catDeudas)
        setDeudas(deudasData.results ?? deudasData)
        setDeudaResumen({
          total_deuda: parseFloat(resDeudas.total_deuda || 0),
          por_categoria: (resDeudas.por_categoria || []).map((c) => ({ ...c, total: parseFloat(c.total) })),
        })
        setProximosVencimientos(proxVenc.results ?? proxVenc)
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  function abrirDetalleMes(mes) {
    setDetalleMes(mes)
    setErrorDetalle('')
    setLoadingDetalle(true)
    api
      .get('/finanzas/dashboard/detalle-mes/', { mes })
      .then((data) => {
        const movimientos = data.results ?? data
        setDetalleMovimientos(movimientos.map((m, i) => ({ ...m, _key: i })))
      })
      .catch((err) => setErrorDetalle(getErrorMessage(err, 'No se pudo cargar el detalle del mes')))
      .finally(() => setLoadingDetalle(false))
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

  function updateDeudaForm(field) {
    return (event) => {
      const value = event.target.value
      if (field === 'categoria' && value === NUEVA_CATEGORIA) {
        setCreatingCategoriaDeuda(true)
        return
      }
      setDeudaForm((f) => ({ ...f, [field]: value }))
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

  async function handleCrearCategoriaDeuda({ nombre, color, tipo_amortizacion }) {
    const nueva = await api.post('/finanzas/categorias-deudas/', { nombre, color, tipo_amortizacion })
    setCategoriaDeudas((cats) => [...cats, nueva])
    setDeudaForm((f) => ({ ...f, categoria: nueva.id }))
    setCreatingCategoriaDeuda(false)
    flashSuccess('Categoría de deuda creada')
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

  async function handleDeleteCategoriaDeuda() {
    const categoria = confirmDeleteCategoriaDeuda
    try {
      await api.delete(`/finanzas/categorias-deudas/${categoria.id}/`)
      setCategoriaDeudas((cats) => cats.filter((c) => c.id !== categoria.id))
      setConfirmDeleteCategoriaDeuda(null)
      flashSuccess('Categoría eliminada')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la categoría (puede estar en uso)'))
      setConfirmDeleteCategoriaDeuda(null)
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

  async function handleAddDeuda(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = { ...deudaForm }
      if (!payload.fecha_vencimiento) delete payload.fecha_vencimiento
      if (!payload.tasa_interes_anual) delete payload.tasa_interes_anual
      if (!payload.pago_periodico) delete payload.pago_periodico
      if (!payload.dia_pago) delete payload.dia_pago
      if (!payload.notas) delete payload.notas
      await api.post('/finanzas/deudas/', payload)
      setDeudaForm(emptyDeudaForm)
      load()
      flashSuccess('Deuda registrada')
    } catch (err) {
      setError(getErrorMessage(err, 'Error al registrar deuda'))
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

  async function handleDeleteDeuda() {
    const deuda = confirmDeleteDeuda
    try {
      await api.delete(`/finanzas/deudas/${deuda.id}/`)
      setConfirmDeleteDeuda(null)
      load()
      flashSuccess('Deuda eliminada')
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar'))
      setConfirmDeleteDeuda(null)
    }
  }

  async function abrirPagoModal(deuda) {
    setPagoModal(deuda)
    setPagoForm(emptyPagoForm)
    setErrorPago('')
    setPagoHistorial([])
    setGastosDisponibles([])
    const [historial, gastosDisp] = await Promise.all([
      api.get(`/finanzas/deudas/${deuda.id}/pagos/`),
      api.get('/finanzas/gastos/', { sin_pago_deuda: 'true' }),
    ])
    setPagoHistorial(historial.results ?? historial)
    setGastosDisponibles(gastosDisp.results ?? gastosDisp)
  }

  async function handleRegistrarPago(event) {
    event.preventDefault()
    setErrorPago('')
    setSubmittingPago(true)
    try {
      await api.post(`/finanzas/deudas/${pagoModal.id}/pagos/`, {
        monto: pagoForm.monto,
        fecha: pagoForm.fecha,
        notas: pagoForm.notas,
        gastos_cubiertos_ids: pagoForm.gastos_cubiertos_ids,
      })
      const [historial, gastosDisp] = await Promise.all([
        api.get(`/finanzas/deudas/${pagoModal.id}/pagos/`),
        api.get('/finanzas/gastos/', { sin_pago_deuda: 'true' }),
      ])
      setPagoHistorial(historial.results ?? historial)
      setGastosDisponibles(gastosDisp.results ?? gastosDisp)
      setPagoForm(emptyPagoForm)
      load()
      flashSuccess('Pago registrado')
    } catch (err) {
      setErrorPago(getErrorMessage(err, 'Error al registrar el pago'))
    } finally {
      setSubmittingPago(false)
    }
  }

  function toggleGastoCubierto(id) {
    setPagoForm((f) => {
      const ids = f.gastos_cubiertos_ids
      return {
        ...f,
        gastos_cubiertos_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      }
    })
  }

  if (loading) return <p>Cargando…</p>

  const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0)
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0)
  const totalDeuda = deudaResumen.total_deuda || 0

  const categoriaDeudaSeleccionada = categoriaDeudas.find((c) => String(c.id) === String(deudaForm.categoria))
  const tipoDeudaSeleccionada = categoriaDeudaSeleccionada?.tipo_amortizacion ?? null

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

      {/* Tab: Deudas */}
      {activeTab === 'Deudas' && (
        <div>
          {categoriaDeudas.length === 0 && !creatingCategoriaDeuda ? (
            <Card style={{ marginBottom: 20 }}>
              <EmptyState
                icon={CreditCard}
                title="Todavía no tenés categorías de deuda"
                description="Las categorías predeterminadas se crean al registrar la organización. También podés crear las tuyas."
                action={<Button onClick={() => setCreatingCategoriaDeuda(true)}>Crear categoría</Button>}
              />
            </Card>
          ) : creatingCategoriaDeuda ? (
            <Card style={{ marginBottom: 20 }}>
              <h3>Nueva categoría de deuda</h3>
              <CategoriaDeudaQuickForm
                onSubmit={handleCrearCategoriaDeuda}
                onCancel={() => setCreatingCategoriaDeuda(false)}
              />
            </Card>
          ) : (
            <Card style={{ marginBottom: 20 }}>
              <h3>Nueva Deuda</h3>
              <form className={styles.form} onSubmit={handleAddDeuda}>
                <div className={styles.row}>
                  <Field label="Categoría">
                    <Select value={deudaForm.categoria} onChange={updateDeudaForm('categoria')} required>
                      <option value="">Seleccionar…</option>
                      {categoriaDeudas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icono} {c.nombre}
                        </option>
                      ))}
                      <option value={NUEVA_CATEGORIA}>+ Nueva categoría</option>
                    </Select>
                  </Field>
                  <Field label="Acreedor">
                    <Input
                      value={deudaForm.acreedor}
                      onChange={updateDeudaForm('acreedor')}
                      required
                      placeholder="Banco, proveedor, persona…"
                    />
                  </Field>
                </div>
                <div className={styles.row}>
                  <Field label="Monto original">
                    <Input
                      type="number"
                      step="0.01"
                      value={deudaForm.monto_original}
                      onChange={updateDeudaForm('monto_original')}
                      required
                    />
                  </Field>
                  <Field label="Fecha de inicio">
                    <Input
                      type="date"
                      value={deudaForm.fecha_inicio}
                      onChange={updateDeudaForm('fecha_inicio')}
                      required
                    />
                  </Field>
                </div>

                {/* Campos condicionales según tipo_amortizacion */}
                {tipoDeudaSeleccionada && tipoDeudaSeleccionada !== 'revolvente' && (
                  <div className={styles.row}>
                    <Field label="Fecha de vencimiento">
                      <Input
                        type="date"
                        value={deudaForm.fecha_vencimiento}
                        onChange={updateDeudaForm('fecha_vencimiento')}
                      />
                    </Field>
                    {tipoDeudaSeleccionada === 'cuotas_fijas' && (
                      <Field label="Pago periódico (cuota)">
                        <Input
                          type="number"
                          step="0.01"
                          value={deudaForm.pago_periodico}
                          onChange={updateDeudaForm('pago_periodico')}
                          placeholder="Monto de la cuota"
                        />
                      </Field>
                    )}
                  </div>
                )}
                {tipoDeudaSeleccionada && tipoDeudaSeleccionada !== 'cuenta_por_pagar' && (
                  <div className={styles.row}>
                    <Field label="Tasa interés anual (%)">
                      <Input
                        type="number"
                        step="0.01"
                        value={deudaForm.tasa_interes_anual}
                        onChange={updateDeudaForm('tasa_interes_anual')}
                        placeholder="Ej. 24.5"
                      />
                    </Field>
                    <Field label="Día de pago (1-31)">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={deudaForm.dia_pago}
                        onChange={updateDeudaForm('dia_pago')}
                        placeholder="Ej. 15"
                      />
                    </Field>
                  </div>
                )}

                <Field label="Notas">
                  <Input
                    value={deudaForm.notas}
                    onChange={updateDeudaForm('notas')}
                    placeholder="Información adicional…"
                  />
                </Field>
                <Button type="submit" disabled={submitting}>
                  <Plus size={16} style={{ marginRight: '8px' }} /> Registrar Deuda
                </Button>
              </form>
            </Card>
          )}

          {categoriaDeudas.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Categorías de deuda</strong>
                <Button variant="secondary" onClick={() => setShowCategoriasDeuda((s) => !s)}>
                  {showCategoriasDeuda ? 'Ocultar' : 'Gestionar categorías'}
                </Button>
              </div>
              {showCategoriasDeuda && (
                <div style={{ marginTop: 12 }}>
                  <Table
                    rowKey={(c) => c.id}
                    emptyMessage="Sin categorías"
                    columns={[
                      {
                        key: 'nombre',
                        header: 'Categoría',
                        render: (c) => (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                            {c.icono} {c.nombre}
                          </span>
                        ),
                      },
                      {
                        key: 'tipo',
                        header: 'Tipo',
                        render: (c) => TIPO_AMORTIZACION_OPTIONS.find((o) => o.value === c.tipo_amortizacion)?.label ?? c.tipo_amortizacion,
                      },
                      {
                        key: 'acciones',
                        header: '',
                        render: (c) => (
                          <Button variant="danger" onClick={() => setConfirmDeleteCategoriaDeuda(c)}>
                            <Trash2 size={16} />
                          </Button>
                        ),
                      },
                    ]}
                    rows={categoriaDeudas}
                  />
                </div>
              )}
            </Card>
          )}

          <Card>
            <h3>Deudas — Saldo total: <span style={{ color: '#e74c3c' }}>{formatMoneda(totalDeuda)}</span></h3>
            <Table
              rowKey={(d) => d.id}
              emptyMessage="Sin deudas registradas"
              columns={[
                { key: 'acreedor', header: 'Acreedor' },
                {
                  key: 'categoria',
                  header: 'Categoría',
                  render: (d) => <CategoriaBubble nombre={d.categoria_nombre} color={d.categoria_color} />,
                },
                {
                  key: 'monto_original',
                  header: 'Monto original',
                  render: (d) => formatMoneda(d.monto_original),
                },
                {
                  key: 'saldo_actual',
                  header: 'Saldo pendiente',
                  render: (d) => (
                    <strong style={{ color: '#e74c3c' }}>{formatMoneda(d.saldo_actual)}</strong>
                  ),
                },
                {
                  key: 'fecha_vencimiento',
                  header: 'Vencimiento',
                  render: (d) => d.fecha_vencimiento ? formatFechaCorta(d.fecha_vencimiento) : '—',
                },
                {
                  key: 'estado',
                  header: 'Estado',
                  render: (d) => (
                    <span style={{ color: ESTADO_COLORS[d.estado] ?? '#333', fontWeight: 600 }}>
                      {ESTADO_LABELS[d.estado] ?? d.estado}
                    </span>
                  ),
                },
                {
                  key: 'acciones',
                  header: '',
                  render: (d) => (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" onClick={() => abrirPagoModal(d)}>
                        Pagos
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmDeleteDeuda(d)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={deudas}
            />
          </Card>
        </div>
      )}

      {/* Tab: Dashboard */}
      {activeTab === 'Dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
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
            <Card>
              <div style={{ textAlign: 'center' }}>
                <h4>Deuda Pendiente</h4>
                <p style={{ fontSize: '24px', color: totalDeuda > 0 ? '#e67e22' : '#27ae60', fontWeight: 'bold' }}>
                  {formatMoneda(totalDeuda)}
                </p>
              </div>
            </Card>
          </div>

          <Card>
            <h3>Resumen Mensual (últimos 12 meses)</h3>
            <Table
              rowKey={(d) => d.mes}
              emptyMessage="Sin datos"
              columns={[
                { key: 'mes', header: 'Mes' },
                { key: 'total_ingresos', header: 'Ingresos', render: (d) => `$${d.total_ingresos}` },
                { key: 'total_gastos', header: 'Gastos', render: (d) => `$${d.total_gastos}` },
                { key: 'ganancia', header: 'Ganancia', render: (d) => `$${d.ganancia}` },
                {
                  key: 'acciones',
                  header: '',
                  render: (d) => (
                    <Button variant="secondary" onClick={() => abrirDetalleMes(d.mes)}>
                      <Eye size={16} style={{ marginRight: '6px' }} /> Ver detalle
                    </Button>
                  ),
                },
              ]}
              rows={dashboard}
            />
          </Card>

          <Card style={{ marginTop: '20px' }}>
            <h3>Resumen por Categoría (Ingresos)</h3>
            <Table
              rowKey={(r) => r.categoria}
              emptyMessage="Sin datos"
              columns={[
                { key: 'categoria', header: 'Categoría' },
                { key: 'total', header: 'Total', render: (r) => `$${r.total}` },
                { key: 'porcentaje', header: 'Porcentaje', render: (r) => `${r.porcentaje}%` },
              ]}
              rows={resumenCategoria}
            />
          </Card>

          {gastosPorDia.length > 0 && (
            <Card style={{ marginTop: '20px' }}>
              <h3>Días con mayor gasto (este mes)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gastosPorDia.map((d) => ({ ...d, fechaCorta: formatFechaCorta(d.fecha) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fechaCorta" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatMoneda(value)} />
                  <Bar dataKey="total" name="Gasto" fill="#e74c3c" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {resumenGastosCategoria.length > 0 && (
            <Card style={{ marginTop: '20px' }}>
              <h3>Gastos por Categoría (este mes)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={resumenGastosCategoria} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value) => formatMoneda(value)} />
                  <Bar dataKey="total" name="Gasto">
                    {resumenGastosCategoria.map((entry, index) => (
                      <Cell key={entry.categoria} fill={CATEGORIA_COLORS[index % CATEGORIA_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {deudaResumen.por_categoria.length > 0 && (
            <Card style={{ marginTop: '20px' }}>
              <h3>Deuda por Categoría</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deudaResumen.por_categoria} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip formatter={(value) => formatMoneda(value)} />
                  <Bar dataKey="total" name="Deuda">
                    {deudaResumen.por_categoria.map((entry) => (
                      <Cell key={entry.categoria} fill={entry.color ?? '#e67e22'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {proximosVencimientos.length > 0 && (
            <Card style={{ marginTop: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#e67e22" /> Próximos vencimientos (30 días)
              </h3>
              <Table
                rowKey={(v) => v.deuda_id}
                emptyMessage="Sin vencimientos próximos"
                columns={[
                  { key: 'acreedor', header: 'Acreedor' },
                  {
                    key: 'categoria',
                    header: 'Categoría',
                    render: (v) => <CategoriaBubble nombre={v.categoria} color={v.categoria_color} />,
                  },
                  { key: 'saldo_actual', header: 'Saldo', render: (v) => formatMoneda(v.saldo_actual) },
                  { key: 'fecha_vencimiento', header: 'Vence', render: (v) => formatFechaCorta(v.fecha_vencimiento) },
                  {
                    key: 'dias_restantes',
                    header: 'Días restantes',
                    render: (v) => (
                      <span style={{ color: v.dias_restantes <= 7 ? '#e74c3c' : '#e67e22', fontWeight: 600 }}>
                        {v.dias_restantes} días
                      </span>
                    ),
                  },
                ]}
                rows={proximosVencimientos}
              />
            </Card>
          )}
        </div>
      )}

      {/* Modal: Detalle de mes */}
      <Modal
        open={detalleMes !== null}
        title={`Movimientos de ${detalleMes}`}
        onClose={() => setDetalleMes(null)}
        wide
      >
        {loadingDetalle ? (
          <p>Cargando…</p>
        ) : errorDetalle ? (
          <p className={styles.error}>{errorDetalle}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table
              rowKey={(m) => m._key}
              emptyMessage="Sin movimientos este mes"
              columns={[
                { key: 'fecha', header: 'Fecha', render: (m) => formatFechaCorta(m.fecha) },
                {
                  key: 'tipo',
                  header: 'Tipo',
                  render: (m) => (
                    <span style={{ color: m.tipo === 'ingreso' ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                      {m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                    </span>
                  ),
                },
                { key: 'categoria', header: 'Categoría' },
                { key: 'monto', header: 'Monto', render: (m) => formatMoneda(m.monto) },
                { key: 'descripcion', header: 'Descripción', render: (m) => m.descripcion || '—' },
              ]}
              rows={detalleMovimientos}
            />
          </div>
        )}
      </Modal>

      {/* Modal: Registrar pago + historial */}
      <Modal
        open={pagoModal !== null}
        title={pagoModal ? `Pagos — ${pagoModal.acreedor}` : ''}
        onClose={() => setPagoModal(null)}
        wide
      >
        {pagoModal && (
          <div>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef9e7', borderRadius: 6, border: '1px solid #f39c12' }}>
              <strong>Saldo pendiente:</strong>{' '}
              <span style={{ color: '#e74c3c', fontWeight: 700 }}>{formatMoneda(pagoModal.saldo_actual)}</span>
              {' — '}
              <span style={{ color: '#666' }}>{pagoModal.categoria_nombre}</span>
            </div>

            <h4 style={{ marginBottom: 12 }}>Registrar nuevo pago</h4>
            <form className={styles.form} onSubmit={handleRegistrarPago}>
              <div className={styles.row}>
                <Field label="Monto pagado">
                  <Input
                    type="number"
                    step="0.01"
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Fecha">
                  <Input
                    type="date"
                    value={pagoForm.fecha}
                    onChange={(e) => setPagoForm((f) => ({ ...f, fecha: e.target.value }))}
                    required
                  />
                </Field>
              </div>
              <Field label="Notas">
                <Input
                  value={pagoForm.notas}
                  onChange={(e) => setPagoForm((f) => ({ ...f, notas: e.target.value }))}
                />
              </Field>
              {gastosDisponibles.length > 0 && (
                <Field label="Gastos que cubre este pago (opcional)">
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                    {gastosDisponibles.map((g) => {
                      const checked = pagoForm.gastos_cubiertos_ids.includes(g.id)
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleGastoCubierto(g.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
                        >
                          {checked
                            ? <CheckSquare size={16} color="#3498db" />
                            : <Square size={16} color="#aaa" />}
                          <span style={{ fontSize: 14 }}>
                            {formatFechaCorta(g.fecha)} — {g.categoria_nombre} — {formatMoneda(g.monto)}
                            {g.descripcion && <span style={{ color: '#888', marginLeft: 6 }}>{g.descripcion}</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </Field>
              )}
              {errorPago && <p className={styles.error}>{errorPago}</p>}
              <Button type="submit" disabled={submittingPago}>
                <Plus size={16} style={{ marginRight: 8 }} /> Registrar Pago
              </Button>
            </form>

            {pagoHistorial.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12 }}>Historial de pagos</h4>
                <Table
                  rowKey={(p) => p.id}
                  emptyMessage="Sin pagos"
                  columns={[
                    { key: 'fecha', header: 'Fecha', render: (p) => formatFechaCorta(p.fecha) },
                    { key: 'monto', header: 'Monto', render: (p) => formatMoneda(p.monto) },
                    { key: 'saldo_resultante', header: 'Saldo tras pago', render: (p) => formatMoneda(p.saldo_resultante) },
                    {
                      key: 'gastos_cubiertos',
                      header: 'Gastos cubiertos',
                      render: (p) =>
                        p.gastos_cubiertos?.length > 0
                          ? p.gastos_cubiertos.map((g) => (
                              <span key={g.id} style={{ display: 'block', fontSize: 12, color: '#555' }}>
                                {g.categoria_nombre} {formatMoneda(g.monto)}
                              </span>
                            ))
                          : '—',
                    },
                    { key: 'notas', header: 'Notas', render: (p) => p.notas || '—' },
                  ]}
                  rows={pagoHistorial}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

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

      <ConfirmDialog
        open={confirmDeleteCategoriaDeuda !== null}
        title="Eliminar categoría de deuda"
        message="Si hay deudas usando esta categoría, no se podrá eliminar."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteCategoriaDeuda}
        onCancel={() => setConfirmDeleteCategoriaDeuda(null)}
      />

      <ConfirmDialog
        open={confirmDeleteDeuda !== null}
        title="Eliminar deuda"
        message="Se eliminará la deuda y todo su historial de pagos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteDeuda}
        onCancel={() => setConfirmDeleteDeuda(null)}
      />
    </div>
  )
}
