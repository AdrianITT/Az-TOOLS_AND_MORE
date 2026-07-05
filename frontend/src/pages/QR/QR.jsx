import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Download, Share2, Trash2, Plus, X } from 'lucide-react'
import styles from '../shared-form.module.css'

const TABS = ['Generar', 'Mis QRs', 'Galería']

const FORMA_OPCIONES = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'circle', label: 'Círculos' },
  { value: 'gapped_square', label: 'Cuadrado con espacio' },
  { value: 'horizontal_bars', label: 'Barras horizontales' },
  { value: 'vertical_bars', label: 'Barras verticales' },
]

const GRADIENTE_OPCIONES = [
  { value: 'none', label: 'Sin degradado (color sólido)' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'radial', label: 'Radial' },
  { value: 'square', label: 'Cuadrado (esquinas)' },
]

const FORMATO_OPCIONES = [
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' },
]

const emptyForm = {
  url_data: '',
  titulo: '',
  color_fg: '#000000',
  color_bg: '#FFFFFF',
  forma: 'square',
  forma_ojos: 'square',
  gradiente_tipo: 'none',
  color_gradiente: '#3498db',
  margen: 4,
  formato: 'png',
}

function getToken() {
  return localStorage.getItem('token')
}

function buildQrFormData(form, { logoFile, guardar } = {}) {
  const fd = new FormData()
  fd.append('url_data', form.url_data)
  if (form.titulo) fd.append('titulo', form.titulo)
  fd.append('color_fg', form.color_fg)
  fd.append('color_bg', form.color_bg)
  fd.append('forma', form.forma)
  fd.append('forma_ojos', form.forma_ojos)
  fd.append('gradiente_tipo', form.gradiente_tipo)
  if (form.gradiente_tipo !== 'none') fd.append('color_gradiente', form.color_gradiente)
  fd.append('margen', form.margen)
  fd.append('formato', form.formato)
  if (logoFile) fd.append('logo', logoFile)
  if (guardar) fd.append('guardar', 'true')
  return fd
}

async function postQr(path, formData) {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { Authorization: `Token ${getToken()}` },
    body: formData,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const err = new Error('Error en la solicitud')
    err.data = data
    throw err
  }
  return response.json()
}

async function postQrDownload(formData) {
  const response = await fetch('/api/qr/codigos/descargar/', {
    method: 'POST',
    headers: { Authorization: `Token ${getToken()}` },
    body: formData,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const err = new Error('Error en la solicitud')
    err.data = data
    throw err
  }
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match ? match[1] : 'qr'
  const blob = await response.blob()
  return { blob, filename }
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

function EstiloQrFields({ form, updateForm, logoFile, logoPreview, onLogoChange, onLogoRemove }) {
  return (
    <>
      <div className={styles.row}>
        <Field label="Color principal">
          <Input type="color" value={form.color_fg} onChange={updateForm('color_fg')} />
        </Field>
        <Field label="Color de fondo">
          <Input type="color" value={form.color_bg} onChange={updateForm('color_bg')} />
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Forma de los módulos" hint="La forma de los puntos que forman el QR.">
          <Select value={form.forma} onChange={updateForm('forma')}>
            {FORMA_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de los ojos" hint="Los 3 cuadros grandes de las esquinas.">
          <Select value={form.forma_ojos} onChange={updateForm('forma_ojos')}>
            {FORMA_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Degradado">
          <Select value={form.gradiente_tipo} onChange={updateForm('gradiente_tipo')}>
            {GRADIENTE_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        {form.gradiente_tipo !== 'none' ? (
          <Field label="Color del degradado">
            <Input type="color" value={form.color_gradiente} onChange={updateForm('color_gradiente')} />
          </Field>
        ) : (
          <Field label="Margen" hint="Espacio en blanco alrededor del QR (0-16).">
            <Input type="number" min={0} max={16} value={form.margen} onChange={updateForm('margen')} />
          </Field>
        )}
      </div>

      {form.gradiente_tipo !== 'none' && (
        <div className={styles.row}>
          <Field label="Margen" hint="Espacio en blanco alrededor del QR (0-16).">
            <Input type="number" min={0} max={16} value={form.margen} onChange={updateForm('margen')} />
          </Field>
        </div>
      )}

      <Field label="Logotipo al centro (opcional)" hint="Se recomienda un logo cuadrado con fondo simple.">
        {logoPreview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 6 }} />
            <Button type="button" variant="secondary" onClick={onLogoRemove}>
              <X size={14} style={{ marginRight: '4px' }} /> Quitar logo
            </Button>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={onLogoChange} />
        )}
      </Field>
    </>
  )
}

export function QR() {
  const [activeTab, setActiveTab] = useState('Generar')
  const [codigos, setCodigos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [previewPng, setPreviewPng] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [formatosDescarga, setFormatosDescarga] = useState({})

  function load() {
    setLoading(true)
    api.get('/qr/codigos/')
      .then((res) => setCodigos(res.results ?? res))
      .catch(() => setError('Error al cargar QRs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function updateForm(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleLogoRemove() {
    setLogoFile(null)
    setLogoPreview(null)
  }

  async function handleGenerar(event) {
    event.preventDefault()
    if (!form.url_data) {
      setError('URL es requerida')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = await postQr('/qr/codigos/generar/', buildQrFormData(form, { logoFile }))
      if (response.png_base64) {
        setPreviewPng(`data:image/png;base64,${response.png_base64}`)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al generar QR'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDescargarPreview() {
    if (!form.url_data) return
    setError('')
    setDescargando(true)
    try {
      const { blob, filename } = await postQrDownload(buildQrFormData(form, { logoFile }))
      downloadBlob(blob, filename)
    } catch (err) {
      setError(getErrorMessage(err, 'Error al descargar QR'))
    } finally {
      setDescargando(false)
    }
  }

  async function handleGuardar(event) {
    event.preventDefault()
    if (!form.url_data || !form.titulo) {
      setError('URL y título son requeridos para guardar')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await postQr('/qr/codigos/generar/', buildQrFormData(form, { logoFile, guardar: true }))
      setForm(emptyForm)
      setLogoFile(null)
      setLogoPreview(null)
      setPreviewPng(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar QR'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDescargar(id) {
    const formato = formatosDescarga[id] || 'png'
    try {
      const token = getToken()
      const response = await fetch(`/api/qr/codigos/${id}/descarga/?formato=${formato}`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!response.ok) throw new Error('Fallo al descargar QR')
      const blob = await response.blob()
      downloadBlob(blob, `qr_${id}.${formato}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Error al descargar QR'))
    }
  }

  async function handleCompartir(qr) {
    const email = prompt('Ingresa email para compartir:')
    if (!email) return
    try {
      await api.post(`/qr/codigos/${qr.id}/compartir/`, { email })
      alert(`QR compartido a ${email}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Error al compartir'))
    }
  }

  async function handleEliminar(id) {
    try {
      await api.delete(`/qr/codigos/${id}/`)
      setConfirmDeleteId(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al eliminar'))
    }
  }

  if (loading) return <p>Cargando…</p>

  return (
    <div>
      <PageHeader title="QR Code Manager" action={null} />

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

      {/* Tab: Generar */}
      {activeTab === 'Generar' && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h3>Generar Nuevo QR</h3>
            <form className={styles.form} onSubmit={handleGenerar}>
              <Field label="URL" required>
                <Input
                  type="url"
                  placeholder="https://ejemplo.com"
                  value={form.url_data}
                  onChange={updateForm('url_data')}
                  required
                />
              </Field>
              <Field label="Título (para guardar)">
                <Input
                  type="text"
                  value={form.titulo}
                  onChange={updateForm('titulo')}
                />
              </Field>

              <EstiloQrFields
                form={form}
                updateForm={updateForm}
                logoFile={logoFile}
                logoPreview={logoPreview}
                onLogoChange={handleLogoChange}
                onLogoRemove={handleLogoRemove}
              />

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Button type="submit" disabled={submitting}>
                  <Plus size={16} style={{ marginRight: '8px' }} /> Generar Preview
                </Button>
                <Field label="Formato de descarga">
                  <Select value={form.formato} onChange={updateForm('formato')}>
                    {FORMATO_OPCIONES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Field>
                <Button type="button" variant="secondary" onClick={handleDescargarPreview} disabled={descargando || !form.url_data}>
                  <Download size={16} style={{ marginRight: '8px' }} />
                  {descargando ? 'Descargando…' : `Descargar ${form.formato.toUpperCase()}`}
                </Button>
                <Button type="button" onClick={handleGuardar} disabled={submitting || !previewPng}>
                  <Plus size={16} style={{ marginRight: '8px' }} /> Guardar QR
                </Button>
              </div>
            </form>
          </Card>

          {previewPng && (
            <Card>
              <h3>Preview</h3>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img src={previewPng} alt="QR Preview" style={{ maxWidth: '300px' }} />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Mis QRs */}
      {activeTab === 'Mis QRs' && (
        <Card>
          <h3>Mis Códigos QR ({codigos.length})</h3>
          <Table
            rowKey={(c) => c.id}
            emptyMessage="Sin QRs guardados"
            columns={[
              {
                key: 'preview',
                header: 'Preview',
                render: (c) => c.png_base64 ? (
                  <img
                    src={`data:image/png;base64,${c.png_base64}`}
                    alt={c.titulo}
                    style={{ width: '80px', height: '80px' }}
                  />
                ) : null,
              },
              { key: 'titulo', header: 'Título' },
              { key: 'url_data', header: 'URL', render: (c) => c.url_data.substring(0, 30) + '...' },
              {
                key: 'cotizacion',
                header: 'Cotización',
                render: (c) => (c.cotizacion_numero ? <Link to={`/cotizaciones/${c.cotizacion}`}>{c.cotizacion_numero}</Link> : '—'),
              },
              { key: 'descargado_veces', header: 'Descargas' },
              { key: 'creado', header: 'Creado', render: (c) => new Date(c.creado).toLocaleDateString() },
              {
                key: 'acciones',
                header: '',
                render: (c) => (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Select
                      value={formatosDescarga[c.id] || 'png'}
                      onChange={(e) => setFormatosDescarga((f) => ({ ...f, [c.id]: e.target.value }))}
                      style={{ width: '80px' }}
                    >
                      {FORMATO_OPCIONES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                    <Button variant="info" title="Descargar" onClick={() => handleDescargar(c.id)}>
                      <Download size={16} />
                    </Button>
                    <Button variant="secondary" title="Compartir" onClick={() => handleCompartir(c)}>
                      <Share2 size={16} />
                    </Button>
                    <Button variant="danger" title="Eliminar" onClick={() => setConfirmDeleteId(c.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={codigos}
          />
        </Card>
      )}

      {/* Tab: Galería */}
      {activeTab === 'Galería' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {codigos.map((qr) => (
              <Card key={qr.id} style={{ padding: '15px', textAlign: 'center' }}>
                {qr.png_base64 && (
                  <img
                    src={`data:image/png;base64,${qr.png_base64}`}
                    alt={qr.titulo}
                    style={{ width: '100%', maxWidth: '200px', marginBottom: '10px' }}
                  />
                )}
                <h4>{qr.titulo}</h4>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  {qr.url_data.substring(0, 30)}...
                </p>
                {qr.cotizacion_numero && (
                  <p style={{ fontSize: '12px', marginBottom: '10px' }}>
                    <Link to={`/cotizaciones/${qr.cotizacion}`}>Cotización {qr.cotizacion_numero}</Link>
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <Button variant="info" size="sm" onClick={() => handleDescargar(qr.id)}>
                    <Download size={14} />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleCompartir(qr)}>
                    <Share2 size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(qr.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {codigos.length === 0 && <p>No hay QRs para mostrar</p>}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar código QR"
        message="Esta acción no se puede deshacer. ¿Querés eliminar este QR?"
        confirmLabel="Eliminar"
        onConfirm={() => handleEliminar(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
