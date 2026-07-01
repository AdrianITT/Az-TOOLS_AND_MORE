import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Download, Share2, Edit2, Trash2, Plus, Copy, Image as ImageIcon } from 'lucide-react'
import styles from '../shared-form.module.css'

const TABS = ['Generar', 'Mis QRs', 'Galería']

const emptyForm = { url_data: '', titulo: '', color_fg: '#000000', color_bg: '#FFFFFF', forma: 'square', guardar: false }

export function QR() {
  const [activeTab, setActiveTab] = useState('Generar')
  const [codigos, setCodigos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [previewPng, setPreviewPng] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

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

  async function handleGenerar(event) {
    event.preventDefault()
    if (!form.url_data) {
      setError('URL es requerida')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = await api.post('/qr/codigos/generar/', form)
      if (response.png_base64) {
        setPreviewPng(`data:image/png;base64,${response.png_base64}`)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Error al generar QR'))
    } finally {
      setSubmitting(false)
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
      const payload = { ...form, guardar: true }
      const response = await api.post('/qr/codigos/generar/', payload)
      setForm(emptyForm)
      setPreviewPng(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar QR'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDescargar(id) {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/qr/codigos/${id}/descarga/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!response.ok) throw new Error('Fallo al descargar QR')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr_${id}.png`
      a.click()
      window.URL.revokeObjectURL(url)
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
              <div className={styles.row}>
                <Field label="Color Foreground">
                  <Input
                    type="color"
                    value={form.color_fg}
                    onChange={updateForm('color_fg')}
                  />
                </Field>
                <Field label="Color Background">
                  <Input
                    type="color"
                    value={form.color_bg}
                    onChange={updateForm('color_bg')}
                  />
                </Field>
              </div>
              <Field label="Forma">
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label>
                    <input
                      type="radio"
                      name="forma"
                      value="square"
                      checked={form.forma === 'square'}
                      onChange={updateForm('forma')}
                    />
                    {' '}Cuadrado
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="forma"
                      value="rounded"
                      checked={form.forma === 'rounded'}
                      onChange={updateForm('forma')}
                    />
                    {' '}Redondeado
                  </label>
                </div>
              </Field>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" disabled={submitting}>
                  <Plus size={16} style={{ marginRight: '8px' }} /> Generar Preview
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
              <Button onClick={() => {
                const link = document.createElement('a')
                link.href = previewPng
                link.download = `qr_${Date.now()}.png`
                link.click()
              }}>
                <Download size={16} style={{ marginRight: '8px' }} /> Descargar PNG
              </Button>
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
              { key: 'descargado_veces', header: 'Descargas' },
              { key: 'creado', header: 'Creado', render: (c) => new Date(c.creado).toLocaleDateString() },
              {
                key: 'acciones',
                header: '',
                render: (c) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
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
