import { useEffect, useMemo, useRef, useState } from 'react'
import { Share2, MessageCircle, Mail } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
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

export function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [itemError, setItemError] = useState('')
  const [itemSubmitting, setItemSubmitting] = useState(false)

  const itemSubtotal = (Number(itemForm.cantidad) || 0) * (Number(itemForm.precio_unitario) || 0)

  function load() {
    setLoading(true)
    return api
      .get('/cotizaciones/')
      .then((data) => setCotizaciones(data.results ?? data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/clientes/').then((data) => setClientes(data.results ?? data))
    api.get('/servicios/').then((data) => setServicios(data.results ?? data))
  }, [])

  const serviciosById = useMemo(() => {
    const map = {}
    servicios.forEach((s) => {
      map[s.id] = s
    })
    return map
  }, [servicios])

  const selectedCotizacion = cotizaciones.find((c) => c.id === selectedId) ?? null
  const panelOpen = showForm || Boolean(selectedId)

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function startCreate() {
    setForm(emptyForm)
    setError('')
    setSelectedId(null)
    setShowForm(true)
  }

  function closePanel() {
    setShowForm(false)
    setSelectedId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const created = await api.post('/cotizaciones/', form)
      setForm(emptyForm)
      setShowForm(false)
      setItemForm(emptyItemForm)
      setItemError('')
      setSelectedId(created.id)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la cotización'))
    } finally {
      setSubmitting(false)
    }
  }

  async function cambiarEstado(cotizacion, estado) {
    await api.post(`/cotizaciones/${cotizacion.id}/cambiar_estado/`, { estado })
    load()
  }

  function toggleDetalle(id) {
    setShowForm(false)
    setSelectedId((current) => (current === id ? null : id))
    setItemForm(emptyItemForm)
    setItemError('')
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
        cotizacion: selectedId,
        servicio: itemForm.servicio,
        cantidad: itemForm.cantidad,
        precio_unitario: itemForm.precio_unitario,
      })
      setItemForm(emptyItemForm)
      await load()
    } catch (err) {
      setItemError(getErrorMessage(err, 'No se pudo agregar el item'))
    } finally {
      setItemSubmitting(false)
    }
  }

  async function handleRemoveItem(itemId) {
    await api.delete(`/items/${itemId}/`)
    load()
  }

  async function descargarPDF(cotizacionId, numero) {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!response.ok) throw new Error('Fallo al generar PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error descargando PDF:', err)
      alert('No se pudo descargar el PDF')
    }
  }

  function abrirWhatsApp() {
    const enlace = `${window.location.origin}/cotizaciones`
    const mensaje = `Mira tu cotización: ${enlace}`
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  async function compartirPorEmail(cotizacionId, clienteEmail) {
    const email = prompt('Email destino:', clienteEmail || '')
    if (!email) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/compartir_email/`, {
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

      alert('Email enviado correctamente')
    } catch (err) {
      console.error('Error compartiendo por email:', err)
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        action={<Button onClick={panelOpen ? closePanel : startCreate}>{panelOpen ? 'Cerrar' : 'Nueva cotización'}</Button>}
      />

      {panelOpen && (
        <Card style={{ marginBottom: 20 }}>
          {showForm ? (
            <form className={formStyles.form} onSubmit={handleSubmit}>
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
                  <Input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={update('fecha_vencimiento')}
                    required
                  />
                </Field>
              </div>
              <Field label="Descripción">
                <Input value={form.descripcion} onChange={update('descripcion')} />
              </Field>
              {error && <p className={formStyles.error}>{error}</p>}
              <Button type="submit" disabled={submitting}>
                Guardar y agregar servicios
              </Button>
            </form>
          ) : selectedCotizacion ? (
            <div>
              <div className={styles.panelHeader}>
                <strong>Cotización {selectedCotizacion.numero}</strong>
                <span>Total: ${selectedCotizacion.total}</span>
              </div>

              {(selectedCotizacion.items ?? []).length === 0 ? (
                <p className={styles.hint}>Agregá los primeros servicios a esta cotización.</p>
              ) : (
                <Table
                  rowKey={(i) => i.id}
                  emptyMessage="Esta cotización todavía no tiene items"
                  columns={[
                    { key: 'servicio', header: 'Servicio', render: (i) => serviciosById[i.servicio]?.nombre ?? i.servicio },
                    { key: 'cantidad', header: 'Cantidad' },
                    { key: 'precio_unitario', header: 'Precio unitario', render: (i) => `$${i.precio_unitario}` },
                    { key: 'subtotal', header: 'Subtotal', render: (i) => `$${i.subtotal}` },
                    {
                      key: 'acciones',
                      header: '',
                      render: (i) => (
                        <Button variant="danger" onClick={() => handleRemoveItem(i.id)}>
                          Quitar
                        </Button>
                      ),
                    },
                  ]}
                  rows={selectedCotizacion.items ?? []}
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
                  Agregar item
                </Button>
              </form>
            </div>
          ) : null}
        </Card>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <Table
          rowKey={(c) => c.id}
          emptyMessage="Todavía no hay cotizaciones"
          columns={[
            { key: 'numero', header: 'Número' },
            { key: 'total', header: 'Total', render: (c) => `$${c.total}` },
            {
              key: 'estado',
              header: 'Estado',
              render: (c) => (
                <Select value={c.estado} onChange={(e) => cambiarEstado(c, e.target.value)}>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </Select>
              ),
            },
            { key: 'fecha_vencimiento', header: 'Vence' },
            {
              key: 'acciones',
              header: '',
              render: (c) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => toggleDetalle(c.id)}>
                    {selectedId === c.id ? 'Ocultar items' : 'Ver items'}
                  </Button>
                  <Button variant="secondary" onClick={() => descargarPDF(c.id, c.numero)}>
                    Descargar PDF
                  </Button>
                  <ShareMenu onWhatsApp={() => abrirWhatsApp(c.id, c.numero)} onEmail={() => compartirPorEmail(c.id, c.cliente)} />
                </div>
              ),
            },
          ]}
          rows={cotizaciones}
        />
      )}
    </div>
  )
}
