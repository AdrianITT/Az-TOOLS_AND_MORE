import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PlusCircle, CheckCircle2, Circle, PenLine, Copy } from 'lucide-react'
import { MasOpciones, PasosFlujo } from '../../components/ui/FormExtras'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import formStyles from '../shared-form.module.css'
import styles from './Servicios.module.css'

const TIPOS_ATRIBUTO = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'color', label: 'Color' },
  { value: 'select', label: 'Lista' },
]

const NUEVA_CATEGORIA = '__nueva__'

const emptyForm = { nombre: '', categoria: '', precio_base: '', descripcion: '' }
const emptyAtributoForm = { nombre: '', tipo: 'text', obligatorio: false, orden: 0, opciones: [] }

export function ServicioForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [atributos, setAtributos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(emptyForm)
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [valoresForm, setValoresForm] = useState({})
  const [initialValoresForm, setInitialValoresForm] = useState({})
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  const [showAtributos, setShowAtributos] = useState(false)
  const [atributoForm, setAtributoForm] = useState(emptyAtributoForm)
  const [atributoError, setAtributoError] = useState('')
  const [atributoSubmitting, setAtributoSubmitting] = useState(false)
  const [highlightAtributoId, setHighlightAtributoId] = useState(null)
  const [atributoJustAdded, setAtributoJustAdded] = useState(false)
  const [confirmDeleteAtributoId, setConfirmDeleteAtributoId] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Copiar atributos desde otra categoría
  const [copiandoDesde, setCopiandoDesde] = useState('')
  const [atributosACopiar, setAtributosACopiar] = useState([])
  const [copiando, setCopiando] = useState(false)

  function loadAtributos() {
    // page_size alto: se necesitan todos los atributos para armar los formularios por categoría
    return api.get('/atributos-plantilla/', { page_size: 200 }).then((data) => setAtributos(data.results ?? data))
  }

  useEffect(() => {
    loadAtributos()
  }, [])

  useEffect(() => {
    if (!isEditing) return
    setLoading(true)
    api
      .get(`/servicios/${id}/`)
      .then((data) => {
        const next = {
          nombre: data.nombre,
          categoria: data.categoria,
          precio_base: data.precio_base,
          descripcion: data.descripcion ?? '',
        }
        setForm(next)
        setInitialForm(next)
        const valores = {}
        ;(data.valores ?? []).forEach((v) => {
          valores[v.atributo] = v.valor
        })
        setValoresForm(valores)
        setInitialValoresForm(valores)
      })
      .catch(() => setError('No se pudo cargar el servicio'))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  const categoriasExistentes = useMemo(() => {
    const set = new Set()
    atributos.forEach((a) => set.add(a.categoria))
    return Array.from(set).sort()
  }, [atributos])

  const categoriaActual = form.categoria === NUEVA_CATEGORIA ? categoriaNueva : form.categoria

  const atributosDeCategoria = useMemo(
    () => atributos.filter((a) => a.categoria === categoriaActual),
    [atributos, categoriaActual],
  )

  // Categorías desde las que se puede copiar (distintas a la actual, con atributos)
  const categoriasParaCopiar = useMemo(
    () => categoriasExistentes.filter((c) => c !== categoriaActual && atributos.some((a) => a.categoria === c)),
    [categoriasExistentes, categoriaActual, atributos],
  )
  const nombresActuales = useMemo(
    () => new Set(atributosDeCategoria.map((a) => a.nombre.toLowerCase())),
    [atributosDeCategoria],
  )
  const atributosOrigen = useMemo(
    () => atributos.filter((a) => a.categoria === copiandoDesde),
    [atributos, copiandoDesde],
  )

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialForm) ||
    JSON.stringify(valoresForm) !== JSON.stringify(initialValoresForm)
  const isAtributoPending = Boolean(atributoForm.nombre.trim())
  const datosCompletos = Boolean(form.nombre.trim() && categoriaActual && form.precio_base)

  function flashSuccess(message) {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 2500)
  }

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function updateValor(atributoId) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? String(event.target.checked) : event.target.value
      setValoresForm((v) => ({ ...v, [atributoId]: value }))
    }
  }

  function goToList() {
    navigate('/servicios')
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmDiscard(true)
    } else {
      goToList()
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      // El backend rechaza valores en blanco (CharField no permite allow_blank)
      // aunque el atributo no sea obligatorio, así que solo enviamos los que tienen contenido.
      const valores = atributosDeCategoria
        .filter((a) => (valoresForm[a.id] ?? '') !== '')
        .map((a) => ({ atributo: a.id, valor: valoresForm[a.id] }))
      const payload = { ...form, categoria: categoriaActual, valores }
      if (isEditing) {
        await api.patch(`/servicios/${id}/`, payload)
        flashSuccess('Cambios guardados')
        goToList()
      } else {
        await api.post('/servicios/', payload)
        goToList()
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el servicio'))
    } finally {
      setSubmitting(false)
    }
  }

  // --- Gestión de plantillas de atributos por categoría ---

  function updateAtributoForm(field) {
    return (event) => {
      const value = field === 'obligatorio' ? event.target.checked : event.target.value
      setAtributoForm((f) => ({ ...f, [field]: value }))
    }
  }

  function addOpcion() {
    setAtributoForm((f) => ({ ...f, opciones: [...f.opciones, ''] }))
  }

  function updateOpcion(index) {
    return (event) => {
      setAtributoForm((f) => {
        const opciones = [...f.opciones]
        opciones[index] = event.target.value
        return { ...f, opciones }
      })
    }
  }

  function removeOpcion(index) {
    setAtributoForm((f) => ({ ...f, opciones: f.opciones.filter((_, i) => i !== index) }))
  }

  // No es un <form>: vive anidado dentro del formulario principal del servicio
  async function crearAtributo() {
    setAtributoError('')
    if (!categoriaActual) {
      setAtributoError('Elegí o escribí una categoría primero')
      return
    }
    if (!atributoForm.nombre.trim()) {
      setAtributoError('Escribí el nombre del atributo')
      return
    }
    setAtributoSubmitting(true)
    try {
      const created = await api.post('/atributos-plantilla/', {
        categoria: categoriaActual,
        nombre: atributoForm.nombre,
        tipo: atributoForm.tipo,
        obligatorio: atributoForm.obligatorio,
        orden: Number(atributoForm.orden) || 0,
        opciones:
          atributoForm.tipo === 'select'
            ? atributoForm.opciones.filter((o) => o.trim()).map((valor, i) => ({ valor, orden: i }))
            : [],
      })
      setAtributoForm(emptyAtributoForm)
      setShowAtributos(true)
      await loadAtributos()
      flashSuccess('Atributo agregado')
      setAtributoJustAdded(true)
      setHighlightAtributoId(created.id)
      setTimeout(() => setAtributoJustAdded(false), 2200)
      setTimeout(() => setHighlightAtributoId(null), 1800)
      document.getElementById('atributo-nombre-input')?.focus()
    } catch (err) {
      setAtributoError(getErrorMessage(err, 'No se pudo crear el atributo'))
    } finally {
      setAtributoSubmitting(false)
    }
  }

  async function deleteAtributo(atrId) {
    try {
      await api.delete(`/atributos-plantilla/${atrId}/`)
      setConfirmDeleteAtributoId(null)
      loadAtributos()
      flashSuccess('Atributo eliminado')
    } catch (err) {
      setAtributoError(getErrorMessage(err, 'No se pudo eliminar el atributo'))
    }
  }

  // --- Copiar atributos de otra categoría ---

  function elegirOrigenCopia(categoria) {
    setCopiandoDesde(categoria)
    // Preselecciona todos los que no existan ya en la categoría actual
    const copiables = atributos
      .filter((a) => a.categoria === categoria && !nombresActuales.has(a.nombre.toLowerCase()))
      .map((a) => a.id)
    setAtributosACopiar(copiables)
  }

  function toggleCopiar(atrId) {
    setAtributosACopiar((ids) => (ids.includes(atrId) ? ids.filter((x) => x !== atrId) : [...ids, atrId]))
  }

  async function copiarAtributos() {
    setAtributoError('')
    setCopiando(true)
    try {
      const seleccionados = atributosOrigen.filter(
        (a) => atributosACopiar.includes(a.id) && !nombresActuales.has(a.nombre.toLowerCase()),
      )
      for (const a of seleccionados) {
        await api.post('/atributos-plantilla/', {
          categoria: categoriaActual,
          nombre: a.nombre,
          tipo: a.tipo,
          obligatorio: a.obligatorio,
          orden: a.orden,
          opciones: (a.opciones ?? []).map((o) => ({ valor: o.valor, orden: o.orden })),
        })
      }
      await loadAtributos()
      setCopiandoDesde('')
      setAtributosACopiar([])
      setShowAtributos(true)
      flashSuccess(`${seleccionados.length} atributo(s) copiados a "${categoriaActual}"`)
    } catch (err) {
      setAtributoError(getErrorMessage(err, 'No se pudieron copiar los atributos'))
    } finally {
      setCopiando(false)
    }
  }

  if (loading) return <p>Cargando…</p>

  const pasos = [
    { label: 'Datos del servicio', estado: datosCompletos ? 'hecho' : 'activo' },
    {
      label: 'Atributos de la categoría',
      estado: !categoriaActual ? 'pendiente' : atributosDeCategoria.length > 0 ? 'hecho' : 'activo',
    },
    { label: 'Valores y guardar', estado: categoriaActual && datosCompletos ? 'activo' : 'pendiente' },
  ]

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar servicio' : 'Nuevo servicio'}
        action={
          <Button variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
        }
      />

      <PasosFlujo pasos={pasos} />
      {!categoriaActual && (
        <p style={{ color: '#888', fontSize: 13, margin: '-8px 0 16px' }}>
          Elegí una categoría en el paso 1 — los atributos (talla, color, etc.) se definen una vez por categoría
          y se reutilizan en todos sus servicios.
        </p>
      )}

      {error && <p className={formStyles.error}>{error}</p>}
      {successMessage && <p className={formStyles.success}>{successMessage}</p>}

      <form className={formStyles.form} onSubmit={handleSubmit}>
        {/* ── Paso 1: datos básicos ─────────────────────────────────── */}
        <Card style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: '0 0 12px' }}>① Datos del servicio</h3>
            {isDirty && (
              <span className={formStyles.pendingBadge}>
                <PenLine size={12} /> Cambios sin guardar
              </span>
            )}
          </div>

          <div className={formStyles.form}>
            <div className={formStyles.row}>
              <Field label="Nombre">
                <Input value={form.nombre} onChange={update('nombre')} required />
              </Field>
              <Field label="Categoría">
                <Select value={form.categoria} onChange={update('categoria')} required>
                  <option value="">Seleccionar…</option>
                  {categoriasExistentes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={NUEVA_CATEGORIA}>+ Nueva categoría</option>
                </Select>
              </Field>
            </div>

            {form.categoria === NUEVA_CATEGORIA && (
              <Field label="Nombre de la nueva categoría">
                <Input value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} required autoFocus />
              </Field>
            )}

            <div className={formStyles.row}>
              <Field label="Precio base">
                <Input type="number" step="0.01" value={form.precio_base} onChange={update('precio_base')} required />
              </Field>
            </div>

            <MasOpciones etiqueta="Más opciones (descripción)">
              <Field label="Descripción">
                <Input value={form.descripcion} onChange={update('descripcion')} placeholder="Opcional" />
              </Field>
            </MasOpciones>
          </div>
        </Card>

        {/* ── Paso 2: atributos de la categoría (opcional) ─────────────── */}
        {categoriaActual && (
          <Card style={{ marginBottom: 4, background: 'var(--color-bg)' }}>
            <h3 style={{ margin: '0 0 4px' }}>② Atributos de "{categoriaActual}" <span style={{ fontWeight: 400, color: '#888', fontSize: 14 }}>(opcional)</span></h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 14px' }}>
              Son los campos extra que se piden en cada servicio de esta categoría (ej. talla, color, material).
              Se definen una sola vez y sirven para todos sus servicios.
            </p>

            {atributosDeCategoria.length > 0 && (
              <p style={{ margin: '0 0 12px', fontSize: 14 }}>
                Esta categoría ya tiene <strong>{atributosDeCategoria.length}</strong>:{' '}
                {atributosDeCategoria.map((a) => a.nombre).join(' · ')}
              </p>
            )}
            {atributosDeCategoria.length === 0 && (
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#92650a' }}>
                Esta categoría todavía no tiene atributos. Podés crearlos, copiarlos de otra categoría, o
                simplemente seguir al paso ③ si no los necesitás.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" onClick={() => setShowAtributos((s) => !s)}>
                {showAtributos ? 'Ocultar gestión' : atributosDeCategoria.length > 0 ? 'Gestionar atributos' : '+ Crear atributos'}
              </Button>
              {categoriasParaCopiar.length > 0 && !copiandoDesde && (
                <Button type="button" variant="secondary" onClick={() => elegirOrigenCopia(categoriasParaCopiar[0])}>
                  <Copy size={14} style={{ marginRight: 6 }} /> Copiar de otra categoría
                </Button>
              )}
            </div>

            {/* Copiar atributos desde otra categoría */}
            {copiandoDesde && (
              <div style={{
                border: '1.5px dashed var(--color-primary, #3498db)', borderRadius: 8,
                padding: 14, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <strong style={{ fontSize: 14 }}>
                  <Copy size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                  Copiar atributos hacia "{categoriaActual}"
                </strong>
                <Field label="Desde la categoría">
                  <Select value={copiandoDesde} onChange={(e) => elegirOrigenCopia(e.target.value)}>
                    {categoriasParaCopiar.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {atributosOrigen.map((a) => {
                    const yaExiste = nombresActuales.has(a.nombre.toLowerCase())
                    const marcado = atributosACopiar.includes(a.id)
                    return (
                      <label
                        key={a.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
                          opacity: yaExiste ? 0.5 : 1, cursor: yaExiste ? 'default' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={marcado && !yaExiste}
                          disabled={yaExiste}
                          onChange={() => toggleCopiar(a.id)}
                        />
                        {a.nombre}
                        <span style={{ color: '#888', fontSize: 12 }}>
                          ({TIPOS_ATRIBUTO.find((t) => t.value === a.tipo)?.label ?? a.tipo}{a.obligatorio ? ', obligatorio' : ''})
                        </span>
                        {yaExiste && <span style={{ color: '#92650a', fontSize: 12 }}>ya existe en "{categoriaActual}"</span>}
                      </label>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    type="button"
                    onClick={copiarAtributos}
                    disabled={copiando || atributosACopiar.filter((id) => !nombresActuales.has(atributosOrigen.find((a) => a.id === id)?.nombre.toLowerCase())).length === 0}
                  >
                    {copiando ? 'Copiando…' : `Copiar ${atributosACopiar.length} atributo(s)`}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setCopiandoDesde('')}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Gestión completa (tabla + alta) */}
            {showAtributos && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Table
                  rowKey={(a) => a.id}
                  rowClassName={(a) => (a.id === highlightAtributoId ? styles.rowJustAdded : undefined)}
                  emptyMessage="Sin atributos en esta categoría"
                  columns={[
                    { key: 'nombre', header: 'Nombre' },
                    { key: 'tipo', header: 'Tipo', render: (a) => TIPOS_ATRIBUTO.find((t) => t.value === a.tipo)?.label ?? a.tipo },
                    { key: 'obligatorio', header: 'Obligatorio', render: (a) => (a.obligatorio ? 'Sí' : 'No') },
                    {
                      key: 'acciones',
                      header: '',
                      render: (a) => (
                        <Button type="button" variant="danger" onClick={() => setConfirmDeleteAtributoId(a.id)}>
                          Borrar
                        </Button>
                      ),
                    },
                  ]}
                  rows={atributosDeCategoria}
                />

                <div className={`${formStyles.form} ${formStyles.draftCard}`}>
                  <div className={formStyles.draftHeader}>
                    <p className={formStyles.draftTitle}>
                      <PlusCircle size={18} /> Nuevo atributo para "{categoriaActual}"
                    </p>
                    {isAtributoPending && (
                      <span className={formStyles.pendingBadge}>
                        <Circle size={8} fill="currentColor" /> Sin agregar todavía
                      </span>
                    )}
                  </div>
                  <p className={formStyles.draftHint}>
                    Completá los datos y presioná "Agregar atributo a la categoría" para sumarlo. Mientras no lo hagas,
                    no queda guardado.
                  </p>

                  <div className={formStyles.row}>
                    <Field label="Nombre del atributo">
                      <Input
                        id="atributo-nombre-input"
                        value={atributoForm.nombre}
                        onChange={updateAtributoForm('nombre')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            crearAtributo()
                          }
                        }}
                      />
                    </Field>
                    <Field label="Tipo">
                      <Select value={atributoForm.tipo} onChange={updateAtributoForm('tipo')}>
                        {TIPOS_ATRIBUTO.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className={formStyles.row}>
                    <Field label="Obligatorio">
                      <input type="checkbox" checked={atributoForm.obligatorio} onChange={updateAtributoForm('obligatorio')} />
                    </Field>
                    <Field label="Orden">
                      <Input
                        type="number"
                        value={atributoForm.orden}
                        onChange={updateAtributoForm('orden')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            crearAtributo()
                          }
                        }}
                      />
                    </Field>
                  </div>

                  {atributoForm.tipo === 'select' && (
                    <Field label="Opciones">
                      {atributoForm.opciones.map((o, i) => (
                        <div key={i} className={formStyles.row}>
                          <Input
                            value={o}
                            onChange={updateOpcion(i)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addOpcion()
                              }
                            }}
                          />
                          <Button type="button" variant="secondary" onClick={() => removeOpcion(i)}>
                            Quitar
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={addOpcion}>
                        + Agregar opción
                      </Button>
                    </Field>
                  )}

                  <div className={formStyles.addButtonRow}>
                    <Button type="button" className={formStyles.addButton} disabled={atributoSubmitting} onClick={crearAtributo}>
                      <PlusCircle size={18} /> {atributoSubmitting ? 'Agregando…' : 'Agregar atributo a la categoría'}
                    </Button>
                    {atributoJustAdded && (
                      <span className={formStyles.addedConfirm}>
                        <CheckCircle2 size={16} /> Atributo agregado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {atributoError && <p className={formStyles.error} style={{ marginTop: 10 }}>{atributoError}</p>}
          </Card>
        )}

        {/* ── Paso 3: valores del servicio y guardar ───────────────────── */}
        {categoriaActual && (
          <Card style={{ marginBottom: 4 }}>
            <h3 style={{ margin: '0 0 4px' }}>③ Valores y guardar</h3>
            {atributosDeCategoria.length > 0 ? (
              <>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 14px' }}>
                  Estos son los atributos de "{categoriaActual}" — completá los valores de ESTE servicio.
                </p>
                <div className={formStyles.form}>
                  {atributosDeCategoria.map((a) => (
                    <Field key={a.id} label={`${a.nombre}${a.obligatorio ? ' *' : ''}`}>
                      {a.tipo === 'boolean' ? (
                        <input type="checkbox" checked={valoresForm[a.id] === 'true'} onChange={updateValor(a.id)} />
                      ) : a.tipo === 'select' ? (
                        <Select value={valoresForm[a.id] ?? ''} onChange={updateValor(a.id)} required={a.obligatorio}>
                          <option value="">Seleccionar…</option>
                          {a.opciones.map((o) => (
                            <option key={o.id} value={o.valor}>
                              {o.valor}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={a.tipo === 'color' ? 'color' : a.tipo === 'number' ? 'number' : a.tipo === 'decimal' ? 'number' : 'text'}
                          step={a.tipo === 'decimal' ? '0.01' : undefined}
                          value={valoresForm[a.id] ?? ''}
                          onChange={updateValor(a.id)}
                          required={a.obligatorio}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: '#888', fontSize: 13, margin: '0 0 14px' }}>
                "{categoriaActual}" no tiene atributos, así que no hay valores que completar — podés guardar directo.
              </p>
            )}

            <Button type="submit" disabled={submitting || (isEditing && !isDirty)} style={{ marginTop: 8 }}>
              {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar servicio'}
            </Button>
          </Card>
        )}

        {/* Sin categoría todavía: el guardar vive abajo igual, deshabilitado con explicación */}
        {!categoriaActual && (
          <Button type="submit" disabled style={{ alignSelf: 'flex-start' }}>
            Guardar servicio (elegí una categoría primero)
          </Button>
        )}
      </form>

      <ConfirmDialog
        open={confirmDeleteAtributoId !== null}
        title="Eliminar atributo"
        message="Se eliminará este atributo y sus opciones. ¿Continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => deleteAtributo(confirmDeleteAtributoId)}
        onCancel={() => setConfirmDeleteAtributoId(null)}
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
