import { useEffect, useState } from 'react'
import { PenLine } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { applyOrgTheme } from '../../utils/theme'
import formStyles from '../shared-form.module.css'
import styles from './Organizacion.module.css'

// La pestaña "Facturación" (razón social, régimen fiscal, uso de CFDI) está implementada
// a nivel de datos/API pero deliberadamente oculta del usuario hasta que el flujo esté completo.
const TABS = [
  { id: 'general', label: 'Información general' },
  { id: 'contacto', label: 'Contacto' },
  { id: 'direccion', label: 'Dirección' },
  { id: 'redes', label: 'Redes sociales' },
  { id: 'logo', label: 'Imagen corporativa' },
  { id: 'apariencia', label: 'Apariencia' },
]

const REGIMEN_FISCAL_OPTIONS = [
  ['601', '601 - General de Ley Personas Morales'],
  ['603', '603 - Personas Morales con Fines no Lucrativos'],
  ['605', '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios'],
  ['606', '606 - Arrendamiento'],
  ['608', '608 - Demás ingresos'],
  ['610', '610 - Residentes en el Extranjero sin Establecimiento Permanente en México'],
  ['612', '612 - Personas Físicas con Actividades Empresariales y Profesionales'],
  ['614', '614 - Ingresos por intereses'],
  ['616', '616 - Sin obligaciones fiscales'],
  ['621', '621 - Incorporación Fiscal'],
  ['622', '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras'],
  ['625', '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas'],
  ['626', '626 - Régimen Simplificado de Confianza'],
]

const USO_CFDI_OPTIONS = [
  ['G01', 'G01 - Adquisición de mercancías'],
  ['G02', 'G02 - Devoluciones, descuentos o bonificaciones'],
  ['G03', 'G03 - Gastos en general'],
  ['I01', 'I01 - Construcciones'],
  ['I04', 'I04 - Equipo de cómputo y accesorios'],
  ['I08', 'I08 - Otra maquinaria y equipo'],
  ['D01', 'D01 - Honorarios médicos, dentales y gastos hospitalarios'],
  ['D10', 'D10 - Pagos por servicios educativos (colegiaturas)'],
  ['P01', 'P01 - Por definir'],
  ['S01', 'S01 - Sin efectos fiscales'],
  ['CP01', 'CP01 - Pagos'],
]

const DEFAULT_COLORS = {
  color_primario: '#3498db',
  color_fondo: '#f5f6f8',
  color_superficie: '#ffffff',
  color_texto: '#1f2430',
  color_menu_fondo: '#ffffff',
  color_menu_texto: '#6b7280',
}

const FIELD_DEFAULTS = {
  nombre: '', nombre_comercial: '', descripcion: '', ruc: '', giro: '',
  razon_social: '', regimen_fiscal: '', uso_cfdi_default: '',
  email: '', telefono: '', whatsapp: '', sitio_web: '',
  direccion: '', calle: '', numero_exterior: '', colonia: '', ciudad: '',
  estado: '', pais: '', codigo_postal: '',
  facebook: '', instagram: '', twitter: '', linkedin: '',
  ...DEFAULT_COLORS,
}

async function patchOrganizacion(formData) {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/organizacion/', {
    method: 'PATCH',
    headers: token ? { Authorization: `Token ${token}` } : undefined,
    body: formData,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const err = new Error('Error al guardar')
    err.data = data
    throw err
  }
  return data
}

function formFromOrg(data) {
  const form = { ...FIELD_DEFAULTS }
  Object.keys(FIELD_DEFAULTS).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) form[key] = data[key]
  })
  return form
}

export function Organizacion() {
  const [org, setOrg] = useState(null)
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [tab, setTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    api
      .get('/organizacion/')
      .then((data) => {
        setOrg(data)
        setForm(formFromOrg(data))
      })
      .catch(() => setError('No se pudo cargar la organización'))
      .finally(() => setLoading(false))
  }, [])

  const dirty = form && org
    ? Object.keys(FIELD_DEFAULTS).some((key) => (form[key] ?? '') !== (org[key] ?? '')) || !!logoFile || removeLogo
    : false

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  }

  function handleLogoFile(file) {
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setRemoveLogo(false)
  }

  function handleLogoChange(event) {
    handleLogoFile(event.target.files?.[0])
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragOver(false)
    handleLogoFile(event.dataTransfer.files?.[0])
  }

  function handleRemoveLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  function handleCancel() {
    if (!org) return
    setForm(formFromOrg(org))
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(false)
    setError('')
  }

  function handleResetColors() {
    setForm((f) => ({ ...f, ...DEFAULT_COLORS }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => formData.append(key, value ?? ''))
      if (logoFile) formData.append('logo', logoFile)
      if (removeLogo) formData.append('remove_logo', 'true')

      const data = await patchOrganizacion(formData)
      setOrg(data)
      setForm(formFromOrg(data))
      setLogoFile(null)
      setLogoPreview(null)
      setRemoveLogo(false)
      setSuccess('Cambios guardados')
      applyOrgTheme(data)
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la organización'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) return <p>Cargando…</p>

  const currentLogo = !removeLogo && (logoPreview || org?.logo)

  return (
    <div>
      <PageHeader title="Mi organización" />

      {error && <p className={formStyles.error}>{error}</p>}
      {success && <p className={formStyles.success}>{success}</p>}
      {dirty && !saving && (
        <span className={formStyles.pendingBadge}>
          <PenLine size={12} /> Cambios sin guardar
        </span>
      )}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <form className={formStyles.form} onSubmit={handleSubmit}>
          {tab === 'general' && (
            <>
              <div className={formStyles.row}>
                <Field label="Nombre">
                  <Input value={form.nombre} onChange={update('nombre')} required />
                </Field>
                <Field label="Nombre comercial">
                  <Input value={form.nombre_comercial} onChange={update('nombre_comercial')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="RFC">
                  <Input value={form.ruc} onChange={update('ruc')} />
                </Field>
                <Field label="Giro">
                  <Input value={form.giro} onChange={update('giro')} />
                </Field>
              </div>
              <Field label="Descripción">
                <textarea
                  className={styles.textarea}
                  value={form.descripcion}
                  onChange={update('descripcion')}
                  rows={3}
                />
              </Field>
            </>
          )}

          {tab === 'contacto' && (
            <>
              <div className={formStyles.row}>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={update('email')} />
                </Field>
                <Field label="Teléfono">
                  <Input value={form.telefono} onChange={update('telefono')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="WhatsApp">
                  <Input value={form.whatsapp} onChange={update('whatsapp')} />
                </Field>
                <Field label="Sitio web">
                  <Input value={form.sitio_web} onChange={update('sitio_web')} />
                </Field>
              </div>
            </>
          )}

          {tab === 'direccion' && (
            <>
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
                <Field label="Código postal">
                  <Input value={form.codigo_postal} onChange={update('codigo_postal')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="Ciudad">
                  <Input value={form.ciudad} onChange={update('ciudad')} />
                </Field>
                <Field label="Estado">
                  <Input value={form.estado} onChange={update('estado')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="País">
                  <Input value={form.pais} onChange={update('pais')} />
                </Field>
                <Field label="Dirección (referencia libre)">
                  <Input value={form.direccion} onChange={update('direccion')} />
                </Field>
              </div>
            </>
          )}

          {tab === 'redes' && (
            <>
              <div className={formStyles.row}>
                <Field label="Facebook">
                  <Input value={form.facebook} onChange={update('facebook')} />
                </Field>
                <Field label="Instagram">
                  <Input value={form.instagram} onChange={update('instagram')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="X (Twitter)">
                  <Input value={form.twitter} onChange={update('twitter')} />
                </Field>
                <Field label="LinkedIn">
                  <Input value={form.linkedin} onChange={update('linkedin')} />
                </Field>
              </div>
            </>
          )}

          {tab === 'facturacion' && (
            <>
              <Field label="Razón social">
                <Input value={form.razon_social} onChange={update('razon_social')} />
              </Field>
              <div className={formStyles.row}>
                <Field label="Régimen fiscal">
                  <Select value={form.regimen_fiscal} onChange={update('regimen_fiscal')}>
                    <option value="">Seleccionar…</option>
                    {REGIMEN_FISCAL_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Uso de CFDI por defecto">
                  <Select value={form.uso_cfdi_default} onChange={update('uso_cfdi_default')}>
                    <option value="">Seleccionar…</option>
                    {USO_CFDI_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <span className={styles.hint}>
                El RFC se define en la pestaña "Información general". Estos datos se usan como referencia para
                facturar tus cotizaciones.
              </span>
            </>
          )}

          {tab === 'logo' && (
            <div
              className={`${styles.logoDrop} ${dragOver ? styles.logoDropActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className={styles.logoRow}>
                <div className={styles.logoPreview}>
                  {currentLogo ? (
                    <img src={currentLogo} alt="Logo de la organización" />
                  ) : (
                    <span>{(form.nombre || '—').slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <Field label="Logo">
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
                    <span className={styles.hint}>
                      PNG, JPG o WEBP, máx. 2MB. Arrastra un archivo aquí o selecciónalo. Se usa en cotizaciones y PDFs.
                    </span>
                  </Field>
                  {currentLogo && (
                    <Button type="button" variant="secondary" onClick={handleRemoveLogo}>
                      Eliminar logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'apariencia' && (
            <>
              <p className={styles.hint}>
                Define los colores de marca de la aplicación. Los tonos derivados (hover, texto sobre color, bordes)
                se calculan automáticamente.
              </p>
              <div className={formStyles.row}>
                <Field label="Color primario">
                  <Input type="color" value={form.color_primario} onChange={update('color_primario')} />
                </Field>
                <Field label="Color de fondo">
                  <Input type="color" value={form.color_fondo} onChange={update('color_fondo')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="Color de superficie/tarjetas">
                  <Input type="color" value={form.color_superficie} onChange={update('color_superficie')} />
                </Field>
                <Field label="Color de texto principal">
                  <Input type="color" value={form.color_texto} onChange={update('color_texto')} />
                </Field>
              </div>
              <div className={formStyles.row}>
                <Field label="Fondo del menú">
                  <Input type="color" value={form.color_menu_fondo} onChange={update('color_menu_fondo')} />
                </Field>
                <Field label="Texto del menú">
                  <Input type="color" value={form.color_menu_texto} onChange={update('color_menu_texto')} />
                </Field>
              </div>

              <div
                className={styles.themePreview}
                style={{
                  '--preview-bg': form.color_fondo,
                  '--preview-surface': form.color_superficie,
                  '--preview-text': form.color_texto,
                  '--preview-primary': form.color_primario,
                  '--preview-menu-bg': form.color_menu_fondo,
                  '--preview-menu-text': form.color_menu_texto,
                }}
              >
                <div className={styles.previewSidebar}>
                  <div className={styles.previewBrand}>Vista previa</div>
                  <div className={styles.previewLink}>Resumen</div>
                  <div className={`${styles.previewLink} ${styles.previewLinkActive}`}>Cotizaciones</div>
                </div>
                <div className={styles.previewBody}>
                  <div className={styles.previewCard}>
                    <p>Así se verán las tarjetas y el texto de la aplicación.</p>
                    <button type="button" className={styles.previewButton}>Botón primario</button>
                  </div>
                </div>
              </div>

              <div className={styles.addButtonRow}>
                <Button type="button" variant="secondary" onClick={handleResetColors}>
                  Restablecer colores por defecto
                </Button>
              </div>
            </>
          )}

          <div className={styles.actions}>
            <Button type="submit" disabled={saving || !dirty}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving || !dirty}>
              Cancelar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
