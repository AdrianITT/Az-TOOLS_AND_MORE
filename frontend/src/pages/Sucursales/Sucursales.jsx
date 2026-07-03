import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import formStyles from '../shared-form.module.css'
import styles from './Sucursales.module.css'

const COLOR_FIELDS = [
  ['color_primario', 'Color primario'],
  ['color_fondo', 'Color de fondo'],
  ['color_superficie', 'Color de superficie'],
  ['color_texto', 'Color de texto'],
  ['color_menu_fondo', 'Fondo del menú'],
  ['color_menu_texto', 'Texto del menú'],
]

const emptyForm = {
  nombre: '', email: '', telefono: '',
  calle: '', numero_exterior: '', colonia: '', ciudad: '', estado: '', pais: '', codigo_postal: '',
  color_primario: '', color_fondo: '', color_superficie: '', color_texto: '', color_menu_fondo: '', color_menu_texto: '',
}

export function Sucursales() {
  const [sucursales, setSucursales] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showTema, setShowTema] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function load() {
    setLoading(true)
    api
      .get('/sucursales/')
      .then((data) => setSucursales(data.results ?? data))
      .catch(() => setError('No se pudieron cargar las sucursales'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function handleNuevo() {
    setEditingId(null)
    setForm(emptyForm)
    setShowTema(false)
    setError('')
    setShowForm((s) => (editingId ? true : !s))
  }

  function handleEditar(sucursal) {
    setEditingId(sucursal.id)
    setForm({
      nombre: sucursal.nombre ?? '',
      email: sucursal.email ?? '',
      telefono: sucursal.telefono ?? '',
      calle: sucursal.calle ?? '',
      numero_exterior: sucursal.numero_exterior ?? '',
      colonia: sucursal.colonia ?? '',
      ciudad: sucursal.ciudad ?? '',
      estado: sucursal.estado ?? '',
      pais: sucursal.pais ?? '',
      codigo_postal: sucursal.codigo_postal ?? '',
      color_primario: sucursal.color_primario ?? '',
      color_fondo: sucursal.color_fondo ?? '',
      color_superficie: sucursal.color_superficie ?? '',
      color_texto: sucursal.color_texto ?? '',
      color_menu_fondo: sucursal.color_menu_fondo ?? '',
      color_menu_texto: sucursal.color_menu_texto ?? '',
    })
    setShowTema(COLOR_FIELDS.some(([key]) => sucursal[key]))
    setError('')
    setShowForm(true)
  }

  function handleCancel() {
    setEditingId(null)
    setForm(emptyForm)
    setShowTema(false)
    setError('')
    setShowForm(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/sucursales/${editingId}/`, form)
      } else {
        await api.post('/sucursales/', form)
      }
      handleCancel()
      load()
    } catch (err) {
      setError(getErrorMessage(err, editingId ? 'No se pudo actualizar la sucursal' : 'No se pudo crear la sucursal'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/sucursales/${id}/`)
      setConfirmDeleteId(null)
      setSucursales((current) => current.filter((s) => s.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la sucursal'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Sucursales"
        action={<Button onClick={handleNuevo}>{showForm && !editingId ? 'Cancelar' : 'Nueva sucursal'}</Button>}
      />

      {error && !showForm && <p className={formStyles.error}>{error}</p>}

      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <div className={formStyles.row}>
              <Field label="Nombre de la sucursal">
                <Input value={form.nombre} onChange={update('nombre')} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={update('email')} />
              </Field>
            </div>
            <div className={formStyles.row}>
              <Field label="Teléfono">
                <Input value={form.telefono} onChange={update('telefono')} />
              </Field>
              <Field label="Código postal">
                <Input value={form.codigo_postal} onChange={update('codigo_postal')} />
              </Field>
            </div>
            <div className={formStyles.row}>
              <Field label="Calle">
                <Input value={form.calle} onChange={update('calle')} />
              </Field>
              <Field label="Número exterior">
                <Input value={form.numero_exterior} onChange={update('numero_exterior')} />
              </Field>
            </div>
            <div className={formStyles.row}>
              <Field label="Colonia">
                <Input value={form.colonia} onChange={update('colonia')} />
              </Field>
              <Field label="Ciudad">
                <Input value={form.ciudad} onChange={update('ciudad')} />
              </Field>
            </div>
            <div className={formStyles.row}>
              <Field label="Estado">
                <Input value={form.estado} onChange={update('estado')} />
              </Field>
              <Field label="País">
                <Input value={form.pais} onChange={update('pais')} />
              </Field>
            </div>

            <div className={styles.panelHeader}>
              <strong>Tema de colores propio</strong>
              <Button type="button" variant="secondary" onClick={() => setShowTema((s) => !s)}>
                {showTema ? 'Ocultar tema' : 'Personalizar tema de esta sucursal'}
              </Button>
            </div>

            {showTema && (
              <>
                <p className={formStyles.draftHint}>
                  Dejá un color en blanco para heredar la paleta general de la organización.
                </p>
                {[0, 1, 2].map((rowIndex) => (
                  <div className={formStyles.row} key={rowIndex}>
                    {COLOR_FIELDS.slice(rowIndex * 2, rowIndex * 2 + 2).map(([key, label]) => (
                      <Field label={label} key={key}>
                        <Input type="color" value={form[key] || '#ffffff'} onChange={update(key)} />
                      </Field>
                    ))}
                  </div>
                ))}
              </>
            )}

            {error && <p className={formStyles.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : sucursales.length === 0 && !showForm ? (
        <EmptyState
          title="Todavía no tienes sucursales"
          description="Registrá sedes adicionales de tu empresa, cada una con su propia dirección, contacto y, opcionalmente, su propio tema de colores."
          action={<Button onClick={handleNuevo}>+ Agregar primera sucursal</Button>}
        />
      ) : (
        <Table
          rowKey={(s) => s.id}
          emptyMessage="Todavía no hay sucursales"
          columns={[
            { key: 'nombre', header: 'Nombre' },
            { key: 'ciudad', header: 'Ciudad' },
            { key: 'telefono', header: 'Teléfono' },
            {
              key: 'tema',
              header: 'Tema propio',
              render: (s) => (COLOR_FIELDS.some(([key]) => s[key]) ? <Palette size={16} /> : '—'),
            },
            { key: 'activo', header: 'Estado', render: (s) => (s.activo ? 'Activa' : 'Inactiva') },
            {
              key: 'acciones',
              header: '',
              render: (s) => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" onClick={() => handleEditar(s)}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDeleteId(s.id)}>
                    Borrar
                  </Button>
                </div>
              ),
            },
          ]}
          rows={sucursales}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar sucursal"
        message="Se eliminará esta sucursal y su configuración de tema. ¿Continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
