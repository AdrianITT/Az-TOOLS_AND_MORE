import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Share2, MessageCircle, Mail } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
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

const emptyForm = { cliente: '', descripcion: '', fecha_vencimiento: '' }
const emptyItemForm = { servicio: '', cantidad: 1, precio_unitario: '' }

function ShareMenu({ onWhatsApp, onEmail }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className={styles.shareMenu} ref={ref}>
      <Button type="button" variant="secondary" onClick={() => setOpen((o) => !o)}>
        <Share2 size={16} /> Compartir
      </Button>
      {open && (
        <div className={styles.shareDropdown}>
          <button
            type="button"
            className={styles.shareOption}
            onClick={() => {
              setOpen(false)
              onWhatsApp()
            }}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button
            type="button"
            className={styles.shareOption}
            onClick={() => {
              setOpen(false)
              onEmail()
            }}
          >
            <Mail size={16} /> Email
          </button>
        </div>
      )}
    </div>
  )
}

export function CotizacionForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [cotizacion, setCotizacion] = useState(null)
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [itemError, setItemError] = useState('')
  const [itemSubmitting, setItemSubmitting] = useState(false)

  const [editingItemId, setEditingItemId] = useState(null)
  const [editItemForm, setEditItemForm] = useState({ cantidad: '', precio_unitario: '' })

  const [confirmRemoveId, setConfirmRemoveId] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const itemSubtotal = (Number(itemForm.cantidad) || 0) * (Number(itemForm.precio_unitario) || 0)

  useEffect(() => {
    api.get('/clientes/').then((data) => setClientes(data.results ?? data))
    api.get('/servicios/').then((data) => setServicios(data.results ?? data))
  }, [])

  useEffect(() => {
    if (!isEditing) return
    setLoading(true)
    api
      .get(`/cotizaciones/${id}/`)
      .then((data) => {
        setCotizacion(data)
        const next = {
          cliente: data.cliente,
          descripcion: data.descripcion ?? '',
          fecha_vencimiento: data.fecha_vencimiento,
        }
        setForm(next)
        setInitialForm(next)
      })
      .catch(() => setError('No se pudo cargar la cotización'))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  const serviciosById = useMemo(() => {
    const map = {}
    servicios.forEach((s) => {
      map[s.id] = s
    })
    return map
  }, [servicios])

  const clientesById = useMemo(() => {
    const map = {}
    clientes.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [clientes])

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  function flashSuccess(message) {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 2500)
  }

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function goToList() {
    navigate('/cotizaciones')
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmDiscard(true)
    } else {
      goToList()
    }
  }

  async function refreshCotizacion() {
    const data = await api.get(`/cotizaciones/${id}/`)
    setCotizacion(data)
  }

  async function handleSubmitInfo(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isEditing) {
        const data = await api.patch(`/cotizaciones/${id}/`, form)
        setCotizacion(data)
        setInitialForm(form)
        flashSuccess('Cambios guardados')
      } else {
        const created = await api.post('/cotizaciones/', form)
        navigate(`/cotizaciones/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la cotización'))
    } finally {
      setSubmitting(false)
    }
  }

  async function cambiarEstado(nuevoEstado) {
    try {
      const data = await api.post(`/cotizaciones/${id}/cambiar_estado/`, { estado: nuevoEstado })
      setCotizacion(data)
      flashSuccess('Estado actualizado')
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar el estado'))
    }
  }

  function updateItemForm(field) {
    return (event) => {
      const value = event.target.value
      setItemForm((f) => {
        const next = { ...f, [field]: value }
        if (field === 'servicio') {
          const servicio = serviciosById[value]
          next.precio_unitario = servicio ? servicio.precio_base : ''
        }
        return next
      })
    }
  }

  async function handleAddItem(event) {
    event.preventDefault()
    setItemError('')
    setItemSubmitting(true)
    try {
      await api.post('/items/', {
        cotizacion: id,
        servicio: itemForm.servicio,
        cantidad: itemForm.cantidad,
        precio_unitario: itemForm.precio_unitario,
      })
      setItemForm(emptyItemForm)
      await refreshCotizacion()
      flashSuccess('Servicio agregado')
    } catch (err) {
      setItemError(getErrorMessage(err, 'No se pudo agregar el item'))
    } finally {
      setItemSubmitting(false)
    }
  }

  function startEditItem(item) {
    setEditingItemId(item.id)
    setEditItemForm({ cantidad: item.cantidad, precio_unitario: item.precio_unitario })
  }

  function cancelEditItem() {
    setEditingItemId(null)
  }

  async function saveEditItem(itemId) {
    setItemError('')
    try {
      await api.patch(`/items/${itemId}/`, {
        cantidad: editItemForm.cantidad,
        precio_unitario: editItemForm.precio_unitario,
      })
      setEditingItemId(null)
      await refreshCotizacion()
      flashSuccess('Item actualizado')
    } catch (err) {
      setItemError(getErrorMessage(err, 'No se pudo actualizar el item'))
    }
  }

  async function handleRemoveItem(itemId) {
    try {
      await api.delete(`/items/${itemId}/`)
      setConfirmRemoveId(null)
      await refreshCotizacion()
      flashSuccess('Item eliminado')
    } catch (err) {
      setItemError(getErrorMessage(err, 'No se pudo quitar el item'))
    }
  }

  async function descargarPDF() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/cotizaciones/${id}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!response.ok) throw new Error('Fallo al generar PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cotizacion.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error descargando PDF:', err)
      setError('No se pudo descargar el PDF')
    }
  }

  function abrirWhatsApp() {
    const enlace = `${window.location.origin}/cotizaciones/${id}`
    const mensaje = `Mira tu cotización: ${enlace}`
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  async function compartirPorEmail() {
    const clienteEmail = clientesById[form.cliente]?.email
    const email = prompt('Email destino:', clienteEmail || '')
    if (!email) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/cotizaciones/${id}/compartir_email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ email_destino: email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fallo al enviar email')
      }

      flashSuccess('Email enviado correctamente')
    } catch (err) {
      console.error('Error compartiendo por email:', err)
      setError(`Error: ${err.message}`)
    }
  }

  if (loading || (isEditing && !cotizacion)) return <p>Cargando…</p>

  return (
    <div>
      <PageHeader
        title={isEditing ? `Cotización ${cotizacion?.numero ?? ''}` : 'Nueva cotización'}
        action={
          <Button variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
        }
      />

      {error && <p className={formStyles.error}>{error}</p>}
      {successMessage && <p className={formStyles.success}>{successMessage}</p>}

      <Card style={{ marginBottom: 20 }}>
        <form className={formStyles.form} onSubmit={handleSubmitInfo}>
          <div className={formStyles.row}>
            <Field label="Cliente">
              <Select value={form.cliente} onChange={update('cliente')} required>
                <option value="">Seleccionar…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de vencimiento">
              <Input type="date" value={form.fecha_vencimiento} onChange={update('fecha_vencimiento')} required />
            </Field>
          </div>
          <Field label="Descripción / Notas">
            <Input value={form.descripcion} onChange={update('descripcion')} />
          </Field>

          {isEditing && (
            <div className={styles.panelHeader}>
              <Field label="Estado">
                <Select value={cotizacion.estado} onChange={(e) => cambiarEstado(e.target.value)}>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <strong>Total: ${cotizacion.total}</strong>
            </div>
          )}

          <Button type="submit" disabled={submitting || (isEditing && !isDirty)}>
            {isEditing ? 'Guardar cambios' : 'Guardar y agregar servicios'}
          </Button>
        </form>
      </Card>

      {isEditing && (
        <Card>
          <div className={styles.panelHeader}>
            <strong>Servicios de la cotización</strong>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button type="button" variant="secondary" onClick={descargarPDF}>
                Descargar PDF
              </Button>
              <ShareMenu onWhatsApp={abrirWhatsApp} onEmail={compartirPorEmail} />
            </div>
          </div>

          {(cotizacion.items ?? []).length === 0 ? (
            <p className={styles.hint}>Agregá los primeros servicios a esta cotización.</p>
          ) : (
            <Table
              rowKey={(i) => i.id}
              emptyMessage="Esta cotización todavía no tiene items"
              columns={[
                { key: 'servicio', header: 'Servicio', render: (i) => serviciosById[i.servicio]?.nombre ?? i.servicio },
                {
                  key: 'cantidad',
                  header: 'Cantidad',
                  render: (i) =>
                    editingItemId === i.id ? (
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={editItemForm.cantidad}
                        onChange={(e) => setEditItemForm((f) => ({ ...f, cantidad: e.target.value }))}
                      />
                    ) : (
                      i.cantidad
                    ),
                },
                {
                  key: 'precio_unitario',
                  header: 'Precio unitario',
                  render: (i) =>
                    editingItemId === i.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editItemForm.precio_unitario}
                        onChange={(e) => setEditItemForm((f) => ({ ...f, precio_unitario: e.target.value }))}
                      />
                    ) : (
                      `$${i.precio_unitario}`
                    ),
                },
                { key: 'subtotal', header: 'Subtotal', render: (i) => `$${i.subtotal}` },
                {
                  key: 'acciones',
                  header: '',
                  render: (i) =>
                    editingItemId === i.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button onClick={() => saveEditItem(i.id)}>Guardar</Button>
                        <Button variant="secondary" onClick={cancelEditItem}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={() => startEditItem(i)}>
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => setConfirmRemoveId(i.id)}>
                          Quitar
                        </Button>
                      </div>
                    ),
                },
              ]}
              rows={cotizacion.items ?? []}
            />
          )}

          <form className={formStyles.form} onSubmit={handleAddItem}>
            <div className={formStyles.row}>
              <Field label="Servicio">
                <Select value={itemForm.servicio} onChange={updateItemForm('servicio')} required>
                  <option value="">Seleccionar…</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cantidad">
                <Input type="number" step="1" min="1" value={itemForm.cantidad} onChange={updateItemForm('cantidad')} required />
              </Field>
              <Field label="Precio unitario">
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.precio_unitario}
                  onChange={updateItemForm('precio_unitario')}
                  required
                />
              </Field>
            </div>
            {itemForm.servicio && (
              <p>
                Subtotal: <strong>${itemSubtotal.toFixed(2)}</strong>
              </p>
            )}
            {itemError && <p className={formStyles.error}>{itemError}</p>}
            <Button type="submit" disabled={itemSubmitting}>
              Agregar servicio
            </Button>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Quitar servicio"
        message="¿Querés quitar este servicio de la cotización?"
        confirmLabel="Quitar"
        onConfirm={() => handleRemoveItem(confirmRemoveId)}
        onCancel={() => setConfirmRemoveId(null)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar cambios"
        message="Tenés cambios sin guardar. ¿Querés descartarlos y volver a la lista?"
        confirmLabel="Descartar"
        onConfirm={() => {
          setConfirmDiscard(false)
          goToList()
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
