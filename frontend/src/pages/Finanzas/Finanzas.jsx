import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
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
import { Trash2, Plus, Wallet, Eye, AlertTriangle, CheckSquare, Square, ChevronDown, ChevronRight, Settings, Camera } from 'lucide-react'
import { MasOpciones, InputMonto } from '../../components/ui/FormExtras'
import { EscanearRecibos } from './EscanearRecibos'
import styles from '../shared-form.module.css'

const monedaFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function formatMoneda(value) {
  return monedaFormatter.format(Number(value ?? 0))
}

function formatFechaCorta(fechaISO) {
  if (!fechaISO) return ''
  const [year, month, day] = fechaISO.split('-')
  return `${day}/${month}/${year}`
}

function nombreMes(mesISO) {
  if (!mesISO) return ''
  const [year, month] = mesISO.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function nombreMesCorto(mesISO) {
  if (!mesISO) return ''
  const [year, month] = mesISO.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('es-MX', { month: 'short' })
}

function deltaPorcentaje(actual, anterior) {
  const a = parseFloat(actual ?? 0)
  const b = parseFloat(anterior ?? 0)
  if (!b) return null
  return ((a - b) / Math.abs(b)) * 100
}

const TABS = ['Ingresos', 'Gastos', 'Deudas', 'Dashboard']
const NUEVA_CATEGORIA = '__nueva__'

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ultimaCategoria(tipo) {
  return localStorage.getItem(`finanzas:ultimaCategoria:${tipo}`) ?? ''
}

function recordarCategoria(tipo, id) {
  if (id) localStorage.setItem(`finanzas:ultimaCategoria:${tipo}`, String(id))
}

function nuevoMovimientoForm(tipo) {
  return { categoria: ultimaCategoria(tipo), monto: '', fecha: hoyISO(), descripcion: '' }
}

function nuevaDeudaForm() {
  return {
    categoria: ultimaCategoria('deudas'),
    acreedor: '',
    monto_original: '',
    fecha_inicio: hoyISO(),
    fecha_vencimiento: '',
    tasa_interes_anual: '',
    pago_periodico: '',
    dia_pago: '',
    notas: '',
  }
}

function nuevoPagoForm() {
  return { monto: '', fecha: hoyISO(), notas: '', gastos_cubiertos_ids: [] }
}

const HINT_TIPO_AMORTIZACION = {
  revolvente: 'Revolvente: el saldo sube con nuevos cargos y baja con pagos; no tiene fecha de fin.',
  cuotas_fijas: 'Cuotas fijas: se paga una cuota fija periódica hasta liquidar en una fecha conocida.',
  cuenta_por_pagar: 'Cuenta por pagar: normalmente sin interés, con una fecha de vencimiento concreta.',
}

const TIPO_AMORTIZACION_OPTIONS = [
  { value: 'revolvente', label: 'Revolvente (tarjeta, línea de crédito)' },
  { value: 'cuotas_fijas', label: 'Cuotas fijas (préstamo, hipoteca)' },
  { value: 'cuenta_por_pagar', label: 'Cuenta por pagar (proveedor, impuesto)' },
]

const ESTADO_LABELS = { activa: 'Activa', pagada: 'Pagada', vencida: 'Vencida' }
const ESTADO_COLORS = { activa: '#27ae60', pagada: '#7f8c8d', vencida: '#e74c3c' }

/** Mini-formulario inline para crear una categoría sin desmontar el formulario padre.
 *  Es un <div> (no <form>) porque vive anidado dentro del formulario del movimiento. */
function CategoriaInline({ conTipo = false, onCrear, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(conTipo ? '#e74c3c' : '#3498db')
  const [tipo, setTipo] = useState('cuotas_fijas')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function crear() {
    if (!nombre.trim()) {
      setError('Escribí un nombre para la categoría')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onCrear(conTipo ? { nombre, color, tipo_amortizacion: tipo } : { nombre, color })
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la categoría'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      border: '1.5px dashed var(--color-primary, #3498db)', borderRadius: 8, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <strong style={{ fontSize: 13 }}>Nueva categoría</strong>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la categoría"
          autoFocus
          style={{ flex: 2, minWidth: 140 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              crear()
            }
          }}
        />
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 38, padding: 2, flexShrink: 0 }} />
        {conTipo && (
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ flex: 2, minWidth: 200 }}>
            {TIPO_AMORTIZACION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        )}
        <Button type="button" onClick={crear} disabled={saving}>
          Crear
        </Button>
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
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

function MiniaturaComprobante({ url }) {
  if (!url) return <span style={{ color: '#ccc' }}>—</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Ver comprobante">
      <img
        src={url}
        alt="comprobante"
        style={{ width: 34, height: 44, objectFit: 'cover', borderRadius: 4, display: 'block', border: '1px solid #ddd' }}
      />
    </a>
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

function StatTile({ label, value, delta, subeEsBueno = true, notaSinDelta = null }) {
  let deltaNode = null
  if (delta !== null && delta !== undefined && isFinite(delta)) {
    const sube = delta >= 0
    const bueno = subeEsBueno ? sube : !sube
    deltaNode = (
      <span style={{ color: bueno ? '#27ae60' : '#e74c3c', fontSize: 13, fontWeight: 600 }}>
        {sube ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs mes anterior
      </span>
    )
  } else if (notaSinDelta) {
    deltaNode = <span style={{ color: '#888', fontSize: 13 }}>{notaSinDelta}</span>
  }
  return (
    <Card>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 6px', color: '#666', fontWeight: 600 }}>{label}</h4>
        <p style={{ fontSize: 22, fontWeight: 'bold', margin: '4px 0' }}>{value}</p>
        {deltaNode}
      </div>
    </Card>
  )
}

function SeccionColapsable({ titulo, resumen, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
          font: 'inherit', color: 'inherit', gap: 12,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <strong style={{ fontSize: 15 }}>{titulo}</strong>
        </span>
        {!open && resumen && (
          <span style={{ color: '#888', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resumen}
          </span>
        )}
      </button>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </Card>
  )
}

function BarrasCategoria({ datos, colorBarra, colorPorNombre = {} }) {
  const filas = datos.filter((d) => parseFloat(d.total) > 0)
  if (filas.length === 0) return <p style={{ color: '#888' }}>Sin datos en este período.</p>
  const max = Math.max(...filas.map((d) => parseFloat(d.total)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {filas.map((d) => (
        <div
          key={d.categoria}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 170px) 1fr 170px', alignItems: 'center', gap: 10 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: d.color ?? colorPorNombre[d.categoria] ?? colorBarra,
            }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.categoria}</span>
          </span>
          <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 4, height: 14 }}>
            <div style={{
              width: `${(parseFloat(d.total) / max) * 100}%`,
              background: colorBarra, height: '100%', borderRadius: 4, minWidth: 2,
            }} />
          </div>
          <span style={{ fontSize: 13, textAlign: 'right' }}>
            {formatMoneda(d.total)}
            {d.porcentaje !== undefined && <span style={{ color: '#888' }}> · {Number(d.porcentaje).toFixed(0)}%</span>}
          </span>
        </div>
      ))}
    </div>
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

  const [ingresoForm, setIngresoForm] = useState(() => nuevoMovimientoForm('ingresos'))
  const [gastoForm, setGastoForm] = useState(() => nuevoMovimientoForm('gastos'))
  const [showFormIngreso, setShowFormIngreso] = useState(false)
  const [showFormGasto, setShowFormGasto] = useState(false)
  const [showFormDeuda, setShowFormDeuda] = useState(false)
  const [escanearTipo, setEscanearTipo] = useState(null) // 'gasto' | 'ingreso' | null
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
  const [deudaForm, setDeudaForm] = useState(() => nuevaDeudaForm())
  const [creatingCategoriaDeuda, setCreatingCategoriaDeuda] = useState(false)
  const [showCategoriasDeuda, setShowCategoriasDeuda] = useState(false)
  const [confirmDeleteDeuda, setConfirmDeleteDeuda] = useState(null)
  const [confirmDeleteCategoriaDeuda, setConfirmDeleteCategoriaDeuda] = useState(null)

  // Pago modal state
  const [pagoModal, setPagoModal] = useState(null)
  const [pagoForm, setPagoForm] = useState(() => nuevoPagoForm())
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
      recordarCategoria('ingresos', ingresoForm.categoria)
      // Conserva categoría y fecha para captura en ráfaga; limpia monto y descripción
      setIngresoForm((f) => ({ ...f, monto: '', descripcion: '' }))
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
      recordarCategoria('gastos', gastoForm.categoria)
      setGastoForm((f) => ({ ...f, monto: '', descripcion: '' }))
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
      recordarCategoria('deudas', deudaForm.categoria)
      setDeudaForm(nuevaDeudaForm())
      setShowFormDeuda(false)
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
    setPagoForm(nuevoPagoForm())
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
      setPagoForm(nuevoPagoForm())
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

  // Derivados del dashboard: el endpoint devuelve los 12 meses del más reciente al más antiguo
  const mesActual = dashboard[0] ?? null
  const mesAnterior = dashboard[1] ?? null
  const balanceMes = parseFloat(mesActual?.ganancia ?? 0)
  const deltaBalance = deltaPorcentaje(mesActual?.ganancia, mesAnterior?.ganancia)
  const deltaIngresos = deltaPorcentaje(mesActual?.total_ingresos, mesAnterior?.total_ingresos)
  const deltaGastos = deltaPorcentaje(mesActual?.total_gastos, mesAnterior?.total_gastos)
  const deudasActivas = deudas.filter((d) => d.estado === 'activa').length
  const vencUrgentes = proximosVencimientos.filter((v) => v.dias_restantes !== null && v.dias_restantes <= 7)
  const tendenciaData = [...dashboard].reverse().map((d) => ({
    mes: d.mes,
    Ingresos: parseFloat(d.total_ingresos),
    Gastos: parseFloat(d.total_gastos),
  }))
  const colorGastoPorNombre = Object.fromEntries(categoriaGastos.map((c) => [c.nombre, c.color]))
  const colorIngresoPorNombre = Object.fromEntries(categoriaIngresos.map((c) => [c.nombre, c.color]))
  const mayorGasto = resumenGastosCategoria.find((r) => parseFloat(r.total) > 0)
  const mayorIngreso = resumenCategoria.find((r) => parseFloat(r.total) > 0)
  const dashboardVacio = ingresos.length === 0 && gastos.length === 0 && deudas.length === 0

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
          {!showFormIngreso && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
              <Button variant="secondary" onClick={() => setEscanearTipo('ingreso')}>
                <Camera size={16} style={{ marginRight: 8 }} /> Escanear recibos
              </Button>
              <Button onClick={() => setShowFormIngreso(true)}>
                <Plus size={16} style={{ marginRight: 8 }} /> Registrar ingreso
              </Button>
            </div>
          )}

          {showFormIngreso && (
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Nuevo Ingreso</h3>
              <form className={styles.form} onSubmit={handleAddIngreso}>
                <div className={styles.row}>
                  <Field label="Monto">
                    <InputMonto value={ingresoForm.monto} onChange={updateIngresoForm('monto')} required autoFocus />
                  </Field>
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
                </div>
                {creatingCategoriaIngreso && (
                  <CategoriaInline
                    onCrear={handleCrearCategoriaIngreso}
                    onCancelar={() => setCreatingCategoriaIngreso(false)}
                  />
                )}
                <div className={styles.row}>
                  <Field label="Fecha">
                    <Input type="date" value={ingresoForm.fecha} onChange={updateIngresoForm('fecha')} required />
                  </Field>
                </div>
                <MasOpciones etiqueta="Más opciones (descripción)">
                  <Field label="Descripción">
                    <Input value={ingresoForm.descripcion} onChange={updateIngresoForm('descripcion')} placeholder="Opcional" />
                  </Field>
                </MasOpciones>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button type="submit" disabled={submitting}>
                    <Plus size={16} style={{ marginRight: '8px' }} /> Registrar ingreso
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowFormIngreso(false)}>
                    Cerrar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Total Ingresos: {formatMoneda(totalIngresos)}</h3>
              <Button variant="secondary" onClick={() => setShowCategoriasIngreso((s) => !s)}>
                <Settings size={14} style={{ marginRight: 6 }} />
                {showCategoriasIngreso ? 'Ocultar categorías' : 'Gestionar categorías'}
              </Button>
            </div>
            {showCategoriasIngreso && (
              <div style={{ marginBottom: 12 }}>
                <CategoriasManager
                  categorias={categoriaIngresos}
                  onDeleteRequest={(categoria) => setConfirmDeleteCategoria({ tipo: 'ingresos', categoria })}
                />
              </div>
            )}
            <Table
              rowKey={(i) => i.id}
              emptyMessage="Sin ingresos"
              columns={[
                { key: 'fecha', header: 'Fecha' },
                { key: 'categoria_nombre', header: 'Categoría' },
                { key: 'monto', header: 'Monto', render: (i) => formatMoneda(i.monto) },
                { key: 'descripcion', header: 'Descripción' },
                { key: 'comprobante', header: 'Recibo', render: (i) => <MiniaturaComprobante url={i.comprobante} /> },
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
          {!showFormGasto && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
              <Button variant="secondary" onClick={() => setEscanearTipo('gasto')}>
                <Camera size={16} style={{ marginRight: 8 }} /> Escanear recibos
              </Button>
              <Button onClick={() => setShowFormGasto(true)}>
                <Plus size={16} style={{ marginRight: 8 }} /> Registrar gasto
              </Button>
            </div>
          )}

          {showFormGasto && (
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Nuevo Gasto</h3>
              <form className={styles.form} onSubmit={handleAddGasto}>
                <div className={styles.row}>
                  <Field label="Monto">
                    <InputMonto value={gastoForm.monto} onChange={updateGastoForm('monto')} required autoFocus />
                  </Field>
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
                </div>
                {creatingCategoriaGasto && (
                  <CategoriaInline
                    onCrear={handleCrearCategoriaGasto}
                    onCancelar={() => setCreatingCategoriaGasto(false)}
                  />
                )}
                <div className={styles.row}>
                  <Field label="Fecha">
                    <Input type="date" value={gastoForm.fecha} onChange={updateGastoForm('fecha')} required />
                  </Field>
                </div>
                <MasOpciones etiqueta="Más opciones (descripción)">
                  <Field label="Descripción">
                    <Input value={gastoForm.descripcion} onChange={updateGastoForm('descripcion')} placeholder="Opcional" />
                  </Field>
                </MasOpciones>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button type="submit" disabled={submitting}>
                    <Plus size={16} style={{ marginRight: '8px' }} /> Registrar gasto
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowFormGasto(false)}>
                    Cerrar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Total Gastos: {formatMoneda(totalGastos)}</h3>
              <Button variant="secondary" onClick={() => setShowCategoriasGasto((s) => !s)}>
                <Settings size={14} style={{ marginRight: 6 }} />
                {showCategoriasGasto ? 'Ocultar categorías' : 'Gestionar categorías'}
              </Button>
            </div>
            {showCategoriasGasto && (
              <div style={{ marginBottom: 12 }}>
                <CategoriasManager
                  categorias={categoriaGastos}
                  onDeleteRequest={(categoria) => setConfirmDeleteCategoria({ tipo: 'gastos', categoria })}
                />
              </div>
            )}
            <Table
              rowKey={(g) => g.id}
              emptyMessage="Sin gastos"
              columns={[
                { key: 'fecha', header: 'Fecha' },
                { key: 'categoria_nombre', header: 'Categoría' },
                { key: 'monto', header: 'Monto', render: (g) => formatMoneda(g.monto) },
                { key: 'descripcion', header: 'Descripción' },
                { key: 'comprobante', header: 'Recibo', render: (g) => <MiniaturaComprobante url={g.comprobante} /> },
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
          {!showFormDeuda && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Button onClick={() => setShowFormDeuda(true)}>
                <Plus size={16} style={{ marginRight: 8 }} /> Registrar deuda
              </Button>
            </div>
          )}

          {showFormDeuda && (
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Nueva Deuda</h3>
              <form className={styles.form} onSubmit={handleAddDeuda}>
                <div className={styles.row}>
                  <Field label="Monto original">
                    <InputMonto
                      value={deudaForm.monto_original}
                      onChange={updateDeudaForm('monto_original')}
                      required
                      autoFocus
                    />
                  </Field>
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
                </div>
                {creatingCategoriaDeuda && (
                  <CategoriaInline
                    conTipo
                    onCrear={handleCrearCategoriaDeuda}
                    onCancelar={() => setCreatingCategoriaDeuda(false)}
                  />
                )}
                {tipoDeudaSeleccionada && (
                  <p style={{ color: '#888', fontSize: 13, margin: '-6px 0 0' }}>
                    {HINT_TIPO_AMORTIZACION[tipoDeudaSeleccionada]}
                  </p>
                )}
                <div className={styles.row}>
                  <Field label="Acreedor">
                    <Input
                      value={deudaForm.acreedor}
                      onChange={updateDeudaForm('acreedor')}
                      required
                      placeholder="Banco, proveedor, persona…"
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

                {/* Campos condicionales según tipo_amortizacion: definen la deuda, van visibles */}
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

                <MasOpciones etiqueta="Más opciones (tasa de interés, día de pago, notas)">
                  {tipoDeudaSeleccionada !== 'cuenta_por_pagar' && (
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
                </MasOpciones>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button type="submit" disabled={submitting}>
                    <Plus size={16} style={{ marginRight: '8px' }} /> Registrar deuda
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowFormDeuda(false)}>
                    Cerrar
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Deudas — Saldo total: <span style={{ color: '#e74c3c' }}>{formatMoneda(totalDeuda)}</span></h3>
              <Button variant="secondary" onClick={() => setShowCategoriasDeuda((s) => !s)}>
                <Settings size={14} style={{ marginRight: 6 }} />
                {showCategoriasDeuda ? 'Ocultar categorías' : 'Gestionar categorías'}
              </Button>
            </div>
            {showCategoriasDeuda && (
              <div style={{ marginBottom: 12 }}>
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
          {dashboardVacio ? (
            <Card>
              <EmptyState
                icon={Wallet}
                title="Todavía no hay movimientos"
                description="Registrá tu primer ingreso, gasto o deuda y acá vas a ver el resumen de cómo va tu negocio."
                action={<Button onClick={() => setActiveTab('Ingresos')}>Registrar un ingreso</Button>}
              />
            </Card>
          ) : (
            <>
              {/* Nivel 1 — Alerta condicional de vencimientos urgentes */}
              {vencUrgentes.length > 0 && (
                <Card style={{ marginBottom: 20, border: '1px solid #e67e22', background: '#fef5e7' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Deudas')}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      font: 'inherit', color: 'inherit', textAlign: 'left',
                    }}
                  >
                    <AlertTriangle size={20} color="#e67e22" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>
                        {vencUrgentes.length === 1
                          ? '1 pago vence en los próximos 7 días'
                          : `${vencUrgentes.length} pagos vencen en los próximos 7 días`}
                      </strong>
                      {' — el más próximo: '}
                      {vencUrgentes[0].acreedor} ({vencUrgentes[0].dias_restantes} {vencUrgentes[0].dias_restantes === 1 ? 'día' : 'días'},{' '}
                      {formatMoneda(vencUrgentes[0].saldo_actual)})
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#e67e22', fontWeight: 600, flexShrink: 0 }}>Ver deudas →</span>
                  </button>
                </Card>
              )}

              {/* Nivel 1 — Balance del mes (héroe) */}
              <Card style={{ marginBottom: 20 }}>
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <h4 style={{ margin: 0, color: '#666', fontWeight: 600 }}>
                    Balance de {nombreMes(mesActual?.mes)}
                  </h4>
                  <p style={{
                    fontSize: 44, fontWeight: 700, margin: '8px 0 4px',
                    color: balanceMes >= 0 ? '#27ae60' : '#e74c3c',
                  }}>
                    {formatMoneda(balanceMes)}
                  </p>
                  {deltaBalance !== null && isFinite(deltaBalance) && (
                    <span style={{ color: deltaBalance >= 0 ? '#27ae60' : '#e74c3c', fontSize: 14, fontWeight: 600 }}>
                      {deltaBalance >= 0 ? '▲' : '▼'} {Math.abs(deltaBalance).toFixed(0)}% vs {nombreMes(mesAnterior?.mes)}
                    </span>
                  )}
                </div>
              </Card>

              {/* Nivel 1 — KPI row del mes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                <StatTile
                  label="Ingresos del mes"
                  value={formatMoneda(mesActual?.total_ingresos)}
                  delta={deltaIngresos}
                  subeEsBueno
                />
                <StatTile
                  label="Gastos del mes"
                  value={formatMoneda(mesActual?.total_gastos)}
                  delta={deltaGastos}
                  subeEsBueno={false}
                />
                <StatTile
                  label="Deuda pendiente"
                  value={formatMoneda(totalDeuda)}
                  delta={null}
                  notaSinDelta={deudasActivas === 0 ? 'Sin deudas activas' : `${deudasActivas} ${deudasActivas === 1 ? 'deuda activa' : 'deudas activas'}`}
                />
              </div>

              {/* Nivel 2 — Tendencia 12 meses */}
              <Card>
                <h3 style={{ marginTop: 0 }}>Tendencia (últimos 12 meses)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={tendenciaData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                    onClick={(e) => e && e.activeLabel && abrirDetalleMes(e.activeLabel)}
                  >
                    <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={nombreMesCorto} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <Tooltip formatter={(value) => formatMoneda(value)} labelFormatter={nombreMes} />
                    <Legend />
                    <Line type="monotone" dataKey="Ingresos" stroke="#27ae60" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Gastos" stroke="#e74c3c" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{ color: '#888', fontSize: 12, textAlign: 'center', margin: '4px 0 0' }}>
                  Hacé clic en un mes para ver el detalle de sus movimientos
                </p>
              </Card>

              {/* Nivel 3 — Desgloses bajo demanda */}
              <SeccionColapsable
                titulo="Gastos por categoría (este mes)"
                resumen={mayorGasto ? `Mayor: ${mayorGasto.categoria} ${formatMoneda(mayorGasto.total)}` : 'Sin gastos este mes'}
              >
                <BarrasCategoria datos={resumenGastosCategoria} colorBarra="#e74c3c" colorPorNombre={colorGastoPorNombre} />
                {gastosPorDia.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 8 }}>Días con mayor gasto</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={gastosPorDia.map((d) => ({ ...d, fechaCorta: formatFechaCorta(d.fecha) }))}>
                        <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
                        <XAxis dataKey="fechaCorta" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatMoneda(value)} />
                        <Bar dataKey="total" name="Gasto" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SeccionColapsable>

              <SeccionColapsable
                titulo="Ingresos por categoría (este mes)"
                resumen={mayorIngreso ? `Mayor: ${mayorIngreso.categoria} ${formatMoneda(mayorIngreso.total)}` : 'Sin ingresos este mes'}
              >
                <BarrasCategoria datos={resumenCategoria} colorBarra="#27ae60" colorPorNombre={colorIngresoPorNombre} />
              </SeccionColapsable>

              <SeccionColapsable
                titulo="Deudas y vencimientos"
                resumen={
                  totalDeuda > 0
                    ? `Pendiente: ${formatMoneda(totalDeuda)}${proximosVencimientos.length > 0 ? ` · ${proximosVencimientos.length} vencimiento(s) en 30 días` : ''}`
                    : 'Sin deuda pendiente'
                }
              >
                {deudaResumen.por_categoria.length > 0 ? (
                  <BarrasCategoria datos={deudaResumen.por_categoria} colorBarra="#e67e22" />
                ) : (
                  <p style={{ color: '#888' }}>Sin deudas activas.</p>
                )}
                {proximosVencimientos.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 8 }}>Próximos vencimientos (30 días)</h4>
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
                  </div>
                )}
              </SeccionColapsable>

              <SeccionColapsable titulo="Tabla mensual completa" resumen="Últimos 12 meses en detalle">
                <Table
                  rowKey={(d) => d.mes}
                  emptyMessage="Sin datos"
                  columns={[
                    { key: 'mes', header: 'Mes', render: (d) => nombreMes(d.mes) },
                    { key: 'total_ingresos', header: 'Ingresos', render: (d) => formatMoneda(d.total_ingresos) },
                    { key: 'total_gastos', header: 'Gastos', render: (d) => formatMoneda(d.total_gastos) },
                    { key: 'ganancia', header: 'Ganancia', render: (d) => formatMoneda(d.ganancia) },
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
              </SeccionColapsable>
            </>
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
                { key: 'comprobante', header: 'Recibo', render: (m) => <MiniaturaComprobante url={m.comprobante} /> },
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
                  <InputMonto
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
                    required
                    autoFocus
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

      <EscanearRecibos
        open={escanearTipo !== null}
        tipoInicial={escanearTipo ?? 'gasto'}
        onClose={() => setEscanearTipo(null)}
        categoriaIngresos={categoriaIngresos}
        categoriaGastos={categoriaGastos}
        onRegistrado={load}
      />
    </div>
  )
}
