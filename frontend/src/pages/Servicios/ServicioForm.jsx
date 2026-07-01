import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
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
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  const [showAtributos, setShowAtributos] = useState(false)
  const [atributoForm, setAtributoForm] = useState(emptyAtributoForm)
  const [atributoError, setAtributoError] = useState('')
  const [atributoSubmitting, setAtributoSubmitting] = useState(false)
  const [confirmDeleteAtributoId, setConfirmDeleteAtributoId] = useState(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  function loadAtributos() {
    return api.get('/atributos-plantilla/').then((data) => setAtributos(data.results ?? data))
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

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

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

  async function handleAtributoSubmit(event) {
    event.preventDefault()
    setAtributoError('')
    if (!categoriaActual) {
      setAtributoError('Elegí o escribí una categoría primero')
      return
    }
    setAtributoSubmitting(true)
    try {
      await api.post('/atributos-plantilla/', {
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
      loadAtributos()
      flashSuccess('Atributo agregado')
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

  if (loading) return <p>Cargando…</p>

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

      {error && <p className={formStyles.error}>{error}</p>}
      {successMessage && <p className={formStyles.success}>{successMessage}</p>}

      <Card style={{ marginBottom: 20 }}>
        <form className={formStyles.form} onSubmit={handleSubmit}>
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
              <Input value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value)} required />
            </Field>
          )}

          <div className={formStyles.row}>
            <Field label="Precio base">
              <Input type="number" step="0.01" value={form.precio_base} onChange={update('precio_base')} required />
            </Field>
            <Field label="Descripción">
              <Input value={form.descripcion} onChange={update('descripcion')} />
            </Field>
          </div>

          {categoriaActual && atributosDeCategoria.length > 0 && (
            <Card>
              <strong>Valores para "{categoriaActual}"</strong>
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
            </Card>
          )}

          <Button type="submit" disabled={submitting}>
            Guardar
          </Button>
        </form>
      </Card>

      {categoriaActual && (
        <Card style={{ marginBottom: 20, background: 'var(--color-bg)' }}>
          <div className={styles.panelHeader}>
            <strong>Atributos de "{categoriaActual}"</strong>
            <Button type="button" variant="secondary" onClick={() => setShowAtributos((s) => !s)}>
              {showAtributos ? 'Ocultar gestión de atributos' : 'Gestionar atributos de esta categoría'}
            </Button>
          </div>

          {atributosDeCategoria.length === 0 && !showAtributos && (
            <EmptyState
              title="Esta categoría todavía no tiene atributos"
              description="Los atributos son campos dinámicos (color, talla, etc.) que se piden al cargar un servicio de esta categoría."
              action={
                <Button type="button" onClick={() => setShowAtributos(true)}>
                  + Agregar primer atributo
                </Button>
              }
            />
          )}

          {showAtributos && (
            <>
              <Table
                rowKey={(a) => a.id}
                emptyMessage="Sin atributos en esta categoría"
                columns={[
                  { key: 'nombre', header: 'Nombre' },
                  { key: 'tipo', header: 'Tipo' },
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

              <form className={formStyles.form} onSubmit={handleAtributoSubmit}>
                <div className={formStyles.row}>
                  <Field label="Nombre del atributo">
                    <Input value={atributoForm.nombre} onChange={updateAtributoForm('nombre')} required />
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
                    <Input type="number" value={atributoForm.orden} onChange={updateAtributoForm('orden')} />
                  </Field>
                </div>

                {atributoForm.tipo === 'select' && (
                  <Field label="Opciones">
                    {atributoForm.opciones.map((o, i) => (
                      <div key={i} className={formStyles.row}>
                        <Input value={o} onChange={updateOpcion(i)} required />
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

                {atributoError && <p className={formStyles.error}>{atributoError}</p>}
                <Button type="submit" disabled={atributoSubmitting}>
                  Agregar atributo
                </Button>
              </form>
            </>
          )}
        </Card>
      )}

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
