import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { MasOpciones } from '../../components/ui/FormExtras'
import formStyles from '../shared-form.module.css'

/** Fecha local de hoy en formato YYYY-MM-DD (toISOString daría la fecha UTC). */
function hoyLocal() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const emptyItem = () => ({
  servicio: '',
  nombre: '',
  cantidad: '1',
  precio_unitario: '',
  fecha_servicio: '',
  atributos: [],
})

const emptyForm = () => ({
  cliente_nombre: '',
  cliente: '',
  cantidad_personas: '1',
  monto_total: '',
  monto_pagado: '0',
  descripcion: '',
  fecha_creacion: hoyLocal(),
  fecha_servicios: '',
})

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function ReciboForm({ id, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyForm)
  const [items, setItems] = useState([emptyItem()])
  // 'ninguna' | 'general' (una fecha para todos) | 'porServicio' (una fecha por servicio)
  const [modoFecha, setModoFecha] = useState('ninguna')
  // Mientras el usuario no edite el monto total, sigue la suma de los servicios registrados
  const [totalManual, setTotalManual] = useState(false)
  const [plantillas, setPlantillas] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(id ? true : false)

  useEffect(() => {
    Promise.all([
      api.get('/clientes/', { page_size: 200 }).then((d) => setClientes(d.results ?? d)).catch(() => {}),
      api.get('/servicios/', { page_size: 200 }).then((d) => setServicios(d.results ?? d)).catch(() => {}),
      api.get('/atributos-plantilla/', { page_size: 200 }).then((d) => setPlantillas(d.results ?? d)).catch(() => {}),
    ])
    if (id) {
      api
        .get(`/finanzas/recibos/${id}/`)
        .then((data) => {
          setForm({
            ...emptyForm(),
            cliente_nombre: data.cliente_nombre || '',
            cliente: data.cliente || '',
            cantidad_personas: String(data.cantidad_personas ?? 1),
            monto_total: data.monto_total,
            monto_pagado: data.monto_pagado,
            descripcion: data.descripcion || '',
            fecha_creacion: data.fecha_creacion,
            fecha_servicios: data.fecha_servicios || '',
          })
          const cargados = (data.items || []).map((i) => ({
            servicio: i.servicio || '',
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario ?? '',
            fecha_servicio: i.fecha_servicio || '',
            atributos: i.atributos || [],
          }))
          setItems(cargados.length ? cargados : [emptyItem()])
          if (cargados.some((i) => i.fecha_servicio)) setModoFecha('porServicio')
          else if (data.fecha_servicios) setModoFecha('general')
          // Si el total guardado no coincide con la suma, fue editado a mano: respetarlo
          setTotalManual(num(data.monto_total) !== num(data.total_servicios))
        })
        .catch(() => setError('No se pudo cargar el recibo'))
        .finally(() => setLoading(false))
    }
  }, [id])

  // Suma solo de los servicios ya registrados (con precio)
  const totalServicios = useMemo(
    () =>
      items.reduce(
        (acc, i) => (i.precio_unitario === '' ? acc : acc + num(i.cantidad) * num(i.precio_unitario)),
        0
      ),
    [items]
  )
  const serviciosRegistrados = items.filter((i) => i.precio_unitario !== '').length

  useEffect(() => {
    if (!totalManual) {
      setForm((f) => ({ ...f, monto_total: totalServicios > 0 ? totalServicios.toFixed(2) : '' }))
    }
  }, [totalServicios, totalManual])

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function updateItem(idx, patch) {
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function atributosDe(servicio) {
    const nombres = Object.fromEntries(plantillas.map((p) => [p.id, p]))
    return (servicio.valores || [])
      .map((v) => ({ nombre: nombres[v.atributo]?.nombre, valor: v.valor, orden: nombres[v.atributo]?.orden ?? 0 }))
      .filter((a) => a.nombre)
      .sort((a, b) => a.orden - b.orden)
      .map(({ nombre, valor }) => ({ nombre, valor }))
  }

  function seleccionarServicio(idx, servicioId) {
    const s = servicios.find((x) => String(x.id) === String(servicioId))
    if (!s) {
      updateItem(idx, { servicio: '', atributos: [] })
      return
    }
    updateItem(idx, {
      servicio: s.id,
      nombre: s.nombre,
      precio_unitario: s.precio_base ?? '',
      atributos: atributosDe(s),
    })
  }

  function cambiarModoFecha(modo) {
    setModoFecha(modo)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.cliente_nombre.trim() && !form.cliente) {
      setError('Necesitás nombre del cliente o seleccionar uno')
      return
    }
    for (const [i, it] of items.entries()) {
      if (!it.nombre.trim() && !it.servicio) {
        setError(`Servicio ${i + 1}: indicá el nombre o seleccioná uno existente`)
        return
      }
      if (!(num(it.cantidad) > 0)) {
        setError(`Servicio ${i + 1}: la cantidad debe ser mayor a 0`)
        return
      }
    }
    if (!form.monto_total) {
      setError('Necesitás ingresar el monto total')
      return
    }
    if (!form.fecha_creacion) {
      setError('La fecha de creación no puede quedar vacía')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        cliente_nombre: form.cliente_nombre || '',
        cliente: form.cliente || null,
        cantidad_personas: form.cantidad_personas,
        monto_total: form.monto_total,
        monto_pagado: form.monto_pagado || 0,
        descripcion: form.descripcion,
        fecha_creacion: form.fecha_creacion,
        fecha_servicios: modoFecha === 'general' && form.fecha_servicios ? form.fecha_servicios : null,
        items: items.map((it) => ({
          servicio: it.servicio || null,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario === '' ? null : it.precio_unitario,
          fecha_servicio: modoFecha === 'porServicio' && it.fecha_servicio ? it.fecha_servicio : null,
          atributos: it.atributos,
        })),
      }
      if (id) {
        await api.patch(`/finanzas/recibos/${id}/`, payload)
      } else {
        await api.post('/finanzas/recibos/', payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar el recibo'))
    } finally {
      setSubmitting(false)
    }
  }

  const montoRestante = Math.max(0, num(form.monto_total) - num(form.monto_pagado)).toFixed(2)

  if (loading) return <p>Cargando…</p>

  return (
    <Card style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>{id ? 'Editar recibo' : 'Nuevo recibo'}</h3>
      <form className={formStyles.form} onSubmit={handleSubmit}>
        {error && <p className={formStyles.error}>{error}</p>}

        <div className={formStyles.row}>
          <Field label="Cliente (nombre libre)">
            <Input
              value={form.cliente_nombre}
              onChange={update('cliente_nombre')}
              placeholder="O selecciona uno abajo"
            />
          </Field>
          <Field label="O selecciona cliente existente">
            <Select value={form.cliente || ''} onChange={update('cliente')}>
              <option value="">Ninguno</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className={formStyles.row}>
          <Field label="Fecha de creación" hint="Por defecto es hoy; puedes cambiarla">
            <Input type="date" value={form.fecha_creacion} onChange={update('fecha_creacion')} required />
          </Field>
          <Field label="Cantidad de personas">
            <Input type="number" min="1" value={form.cantidad_personas} onChange={update('cantidad_personas')} />
          </Field>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <strong>Servicios del recibo</strong>
          {items.map((it, idx) => (
            <div
              key={idx}
              data-testid="recibo-item"
              style={{ border: '1px solid #e3e6ea', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div className={formStyles.row}>
                <Field label={`Servicio ${idx + 1} (nombre libre)`}>
                  <Input
                    value={it.nombre}
                    onChange={(e) => updateItem(idx, { nombre: e.target.value })}
                    placeholder="O selecciona uno del catálogo"
                  />
                </Field>
                <Field label="O selecciona del catálogo">
                  <Select value={it.servicio || ''} onChange={(e) => seleccionarServicio(idx, e.target.value)}>
                    <option value="">Ninguno</option>
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {it.atributos.length > 0 && (
                <div data-testid="recibo-item-atributos" style={{ background: '#f8f9fa', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Atributos del servicio</div>
                  {it.atributos.map((a) => (
                    <div key={a.nombre}>
                      <span style={{ color: '#7f8c8d' }}>{a.nombre}:</span> {a.valor}
                    </div>
                  ))}
                </div>
              )}

              <div className={formStyles.row}>
                <Field label="Cantidad">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={it.cantidad}
                    onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Precio unitario" hint="Sin precio, el servicio no suma al total">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={it.precio_unitario}
                    onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })}
                  />
                </Field>
              </div>

              {modoFecha === 'porServicio' && (
                <Field label="Fecha del servicio (opcional)">
                  <Input
                    type="date"
                    value={it.fecha_servicio}
                    onChange={(e) => updateItem(idx, { fecha_servicio: e.target.value })}
                  />
                </Field>
              )}

              {items.length > 1 && (
                <div>
                  <Button
                    type="button"
                    variant="danger"
                    title="Quitar servicio"
                    onClick={() => setItems((list) => list.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={16} style={{ marginRight: 6 }} /> Quitar servicio
                  </Button>
                </div>
              )}
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" onClick={() => setItems((list) => [...list, emptyItem()])}>
              <Plus size={16} style={{ marginRight: 6 }} /> Agregar otro servicio
            </Button>
          </div>
        </div>

        <div className={formStyles.row}>
          <Field label="Fecha de los servicios (opcional)">
            <Select value={modoFecha} onChange={(e) => cambiarModoFecha(e.target.value)}>
              <option value="ninguna">Sin fecha</option>
              <option value="general">Una fecha para todos los servicios</option>
              <option value="porServicio">Una fecha por servicio</option>
            </Select>
          </Field>
          {modoFecha === 'general' && (
            <Field label="Fecha de los servicios">
              <Input type="date" value={form.fecha_servicios} onChange={update('fecha_servicios')} />
            </Field>
          )}
        </div>

        <div
          data-testid="total-servicios"
          style={{ padding: 12, background: '#eef7ff', borderRadius: 6, fontSize: 13 }}
        >
          <strong>Monto total de servicios registrados:</strong> ${totalServicios.toFixed(2)}
          <span style={{ color: '#7f8c8d' }}>
            {' '}
            ({serviciosRegistrados} de {items.length} con precio)
          </span>
        </div>

        <div className={formStyles.row}>
          <Field
            label="Monto total"
            hint={totalManual ? 'Editado manualmente' : 'Se calcula con los servicios; puedes editarlo'}
          >
            <Input
              type="number"
              step="0.01"
              value={form.monto_total}
              onChange={(e) => {
                setTotalManual(true)
                update('monto_total')(e)
              }}
              required
            />
          </Field>
          <Field label="Monto pagado">
            <Input type="number" step="0.01" value={form.monto_pagado} onChange={update('monto_pagado')} />
          </Field>
        </div>

        {totalManual && (
          <div>
            <Button type="button" variant="secondary" onClick={() => setTotalManual(false)}>
              Restablecer a la suma de servicios
            </Button>
          </div>
        )}

        {form.monto_total && (
          <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            <strong>Monto restante:</strong>{' '}
            <span style={{ color: montoRestante === '0.00' ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>
              ${montoRestante}
            </span>
          </div>
        )}

        <MasOpciones etiqueta="Más opciones (descripción)">
          <Field label="Descripción / Notas">
            <Input value={form.descripcion} onChange={update('descripcion')} placeholder="Opcional" />
          </Field>
        </MasOpciones>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear recibo'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
