import { useEffect, useMemo, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import styles from '../shared-form.module.css'

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

export function Servicios() {
  const [servicios, setServicios] = useState([])
  const [atributos, setAtributos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [categoriaNueva, setCategoriaNueva] = useState('')
  const [valoresForm, setValoresForm] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [submitting, setSubmitting] = useState(false)

  const [showAtributos, setShowAtributos] = useState(false)
  const [atributoForm, setAtributoForm] = useState(emptyAtributoForm)
  const [atributoError, setAtributoError] = useState('')
  const [atributoSubmitting, setAtributoSubmitting] = useState(false)

  function loadServicios() {
    setLoading(true)
    api
      .get('/servicios/')
      .then((data) => setServicios(data.results ?? data))
      .finally(() => setLoading(false))
  }

  function loadAtributos() {
    return api.get('/atributos-plantilla/').then((data) => setAtributos(data.results ?? data))
  }

  useEffect(() => {
    loadServicios()
    loadAtributos()
  }, [])

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

  const categoriaActual = form.categoria === NUEVA_CATEGORIA ? categoriaNueva : form.categoria

  const atributosDeCategoria = useMemo(
    () => atributos.filter((a) => a.categoria === categoriaActual),
    [atributos, categoriaActual],
  )

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function updateValor(atributoId) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? String(event.target.checked) : event.target.value
      setValoresForm((v) => ({ ...v, [atributoId]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const valores = atributosDeCategoria.map((a) => ({
        atributo: a.id,
        valor: valoresForm[a.id] ?? '',
      }))
      await api.post('/servicios/', { ...form, categoria: categoriaActual, valores })
      setForm(emptyForm)
      setCategoriaNueva('')
      setValoresForm({})
      setShowForm(false)
      loadServicios()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el servicio'))
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
      loadAtributos()
    } catch (err) {
      setAtributoError(getErrorMessage(err, 'No se pudo crear el atributo'))
    } finally {
      setAtributoSubmitting(false)
    }
  }

  async function deleteAtributo(id) {
    await api.delete(`/atributos-plantilla/${id}/`)
    loadAtributos()
  }

  return (
    <div>
      <PageHeader
        title="Servicios"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nuevo servicio'}</Button>}
      />

      {showForm && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
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

              <div className={styles.row}>
                <Field label="Precio base">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.precio_base}
                    onChange={update('precio_base')}
                    required
                  />
                </Field>
                <Field label="Descripción">
                  <Input value={form.descripcion} onChange={update('descripcion')} />
                </Field>
              </div>

              {atributosDeCategoria.length > 0 && (
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

              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" disabled={submitting}>
                Guardar
              </Button>
            </form>
          </Card>

          {categoriaActual && (
            <Card style={{ marginBottom: 20, background: 'var(--color-bg)' }}>
              <div className={styles.row} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Atributos de "{categoriaActual}" (config. de la categoría)</strong>
                <Button type="button" variant="secondary" onClick={() => setShowAtributos((s) => !s)}>
                  {showAtributos ? 'Ocultar gestión de atributos' : 'Gestionar atributos de esta categoría'}
                </Button>
              </div>

              {atributosDeCategoria.length === 0 && !showAtributos && (
                <p>Esta categoría todavía no tiene atributos definidos.</p>
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
                          <Button type="button" variant="danger" onClick={() => deleteAtributo(a.id)}>
                            Borrar
                          </Button>
                        ),
                      },
                    ]}
                    rows={atributosDeCategoria}
                  />

                  <form className={styles.form} onSubmit={handleAtributoSubmit}>
                    <div className={styles.row}>
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
                    <div className={styles.row}>
                      <Field label="Obligatorio">
                        <input
                          type="checkbox"
                          checked={atributoForm.obligatorio}
                          onChange={updateAtributoForm('obligatorio')}
                        />
                      </Field>
                      <Field label="Orden">
                        <Input type="number" value={atributoForm.orden} onChange={updateAtributoForm('orden')} />
                      </Field>
                    </div>

                    {atributoForm.tipo === 'select' && (
                      <Field label="Opciones">
                        {atributoForm.opciones.map((o, i) => (
                          <div key={i} className={styles.row}>
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

                    {atributoError && <p className={styles.error}>{atributoError}</p>}
                    <Button type="submit" disabled={atributoSubmitting}>
                      Agregar atributo
                    </Button>
                  </form>
                </>
              )}
            </Card>
          )}
        </div>
      )}

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
          ]}
          rows={servicios}
        />
      )}
    </div>
  )
}
