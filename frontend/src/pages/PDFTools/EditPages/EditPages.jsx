import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, RotateCw, X } from 'lucide-react'
import { PageHeader } from '../../PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Input } from '../../../components/ui/Input'
import { DropZone } from '../components/DropZone'
import { ProgressBar } from '../components/ProgressBar'
import { ErrorModal } from '../components/ErrorModal'
import {
  uploadFormForJson,
  uploadFormForPdf,
  downloadBlob,
  PdfToolError,
} from '../services/pdfToolsApi'
import styles from './EditPages.module.css'

let nextId = 0

export function EditPages() {
  const [sourceFile, setSourceFile] = useState(null)
  const [pages, setPages] = useState([])
  const [outputName, setOutputName] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleFiles(files) {
    const file = files[0]
    if (!file) return
    setError('')
    setSuccess(false)
    setSourceFile(file)
    setPages([])
    setLoadingPreview(true)
    try {
      const data = await uploadFormForJson('/edit-pages/inspect/', { file })
      setPages(
        data.pages.map((p) => ({
          id: `p${nextId++}`,
          originalPage: p.page,
          rotate: 0,
          thumbnail: p.thumbnail,
        })),
      )
    } catch (err) {
      setError(err instanceof PdfToolError ? err.message : 'No se pudo leer el PDF.')
      setSourceFile(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  function movePage(from, to) {
    if (to < 0 || to >= pages.length) return
    setPages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function rotatePage(id) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotate: (p.rotate + 90) % 360 } : p)),
    )
  }

  function removePage(id) {
    setPages((prev) => prev.filter((p) => p.id !== id))
  }

  function reset() {
    setSourceFile(null)
    setPages([])
    setOutputName('')
    setSuccess(false)
  }

  async function handleSubmit() {
    setError('')
    setSuccess(false)
    setSubmitting(true)
    setProgress(0)
    try {
      const operations = JSON.stringify(
        pages.map((p) => ({ page: p.originalPage, rotate: p.rotate })),
      )
      const { blob, filename } = await uploadFormForPdf(
        '/edit-pages/',
        { file: sourceFile, operations, output_name: outputName },
        { onProgress: setProgress, fallbackFilename: 'editado.pdf' },
      )
      downloadBlob(blob, filename)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof PdfToolError ? err.message : 'Ocurrió un error al procesar el PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = loadingPreview || submitting

  return (
    <div>
      <PageHeader
        title="Editar páginas"
        action={
          <Link to="/pdf-tools" className={styles.backLink}>
            <ArrowLeft size={16} /> Herramientas PDF
          </Link>
        }
      />
      <Card className={styles.card}>
        <p className={styles.description}>
          Selecciona un PDF para reordenar, rotar o eliminar sus páginas antes de generar el resultado.
        </p>

        {pages.length === 0 && (
          <DropZone
            accept="application/pdf"
            multiple={false}
            onFiles={handleFiles}
            disabled={busy}
            hint="Formatos permitidos: application/pdf"
          />
        )}

        {loadingPreview && <p className={styles.loading}>Leyendo páginas del PDF…</p>}

        {pages.length > 0 && (
          <>
            <div className={styles.grid}>
              {pages.map((page, index) => (
                <div key={page.id} className={styles.pageCard}>
                  <img
                    src={`data:image/png;base64,${page.thumbnail}`}
                    alt={`Página ${page.originalPage}`}
                    className={styles.thumb}
                    style={{ transform: `rotate(${page.rotate}deg)` }}
                  />
                  <span className={styles.pageLabel}>Pág. original {page.originalPage}</span>
                  <div className={styles.pageActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={busy || index === 0}
                      onClick={() => movePage(index, index - 1)}
                      aria-label="Mover antes"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={busy}
                      onClick={() => rotatePage(page.id)}
                      aria-label="Rotar"
                    >
                      <RotateCw size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={busy}
                      onClick={() => removePage(page.id)}
                      aria-label="Eliminar página"
                    >
                      <X size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={busy || index === pages.length - 1}
                      onClick={() => movePage(index, index + 1)}
                      aria-label="Mover después"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Field label="Nombre del archivo (opcional)">
              <Input
                type="text"
                placeholder="editado"
                value={outputName}
                onChange={(event) => setOutputName(event.target.value)}
                disabled={busy}
              />
            </Field>
          </>
        )}

        {success && <p className={styles.success}>PDF generado y descargado correctamente.</p>}

        {submitting && <ProgressBar value={progress} />}

        {pages.length > 0 && (
          <div className={styles.actions}>
            <Button variant="primary" onClick={handleSubmit} disabled={busy || pages.length === 0}>
              <Download size={16} /> {submitting ? 'Procesando…' : 'Generar PDF'}
            </Button>
            {!submitting && (
              <Button variant="secondary" onClick={reset}>
                Empezar de nuevo
              </Button>
            )}
          </div>
        )}
      </Card>

      <ErrorModal message={error} onClose={() => setError('')} />
    </div>
  )
}
