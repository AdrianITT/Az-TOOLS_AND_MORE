import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { PageHeader } from '../../PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select } from '../../../components/ui/Input'
import { DropZone } from './DropZone'
import { FileList } from './FileList'
import { ProgressBar } from './ProgressBar'
import { ErrorModal } from './ErrorModal'
import { usePdfFiles } from '../hooks/usePdfFiles'
import { uploadFilesForPdf, downloadBlob, PdfToolError } from '../services/pdfToolsApi'
import styles from './PdfToolPage.module.css'

export function PdfToolPage({
  title,
  description,
  endpoint,
  accept,
  minFiles = 1,
  singleFile = false,
  withPreview = false,
  actionLabel,
  outputFilename,
  extraFields = [],
}) {
  const { items, addFiles, removeFile, moveFile, reset } = usePdfFiles({ withPreview })
  const [outputName, setOutputName] = useState('')
  const [extraValues, setExtraValues] = useState(
    () => Object.fromEntries(extraFields.map((field) => [field.name, field.defaultValue ?? ''])),
  )
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  const canSubmit = items.length >= minFiles && !submitting

  function handleFiles(newFiles) {
    if (singleFile) {
      reset()
      addFiles(newFiles.slice(0, 1))
    } else {
      addFiles(newFiles)
    }
  }

  async function handleSubmit() {
    setError('')
    setSuccess(false)
    setSubmitting(true)
    setProgress(0)
    try {
      const fileField = singleFile ? { file: items[0].file } : { files: items.map((item) => item.file) }
      const { blob, filename } = await uploadFilesForPdf(
        endpoint,
        [],
        { onProgress: setProgress, outputName, fallbackFilename: outputFilename, ...fileField, ...extraValues },
      )
      downloadBlob(blob, filename)
      setSuccess(true)
      reset()
      setOutputName('')
    } catch (err) {
      setError(err instanceof PdfToolError ? err.message : 'Ocurrió un error al procesar los archivos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        action={
          <Link to="/pdf-tools" className={styles.backLink}>
            <ArrowLeft size={16} /> Herramientas PDF
          </Link>
        }
      />
      <Card className={styles.card}>
        {description && <p className={styles.description}>{description}</p>}

        <DropZone
          accept={accept}
          multiple={!singleFile}
          onFiles={handleFiles}
          disabled={submitting}
          hint={`Formatos permitidos: ${accept}`}
        />

        <FileList items={items} onRemove={removeFile} onMove={moveFile} disabled={submitting} />

        {items.length > 0 && extraFields.map((field) => (
          <Field key={field.name} label={field.label}>
            {field.type === 'select' ? (
              <Select
                value={extraValues[field.name]}
                disabled={submitting}
                onChange={(event) => setExtraValues((v) => ({ ...v, [field.name]: event.target.value }))}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                type="text"
                placeholder={field.placeholder}
                value={extraValues[field.name]}
                disabled={submitting}
                onChange={(event) => setExtraValues((v) => ({ ...v, [field.name]: event.target.value }))}
              />
            )}
            {field.hint && <span className={styles.fieldHint}>{field.hint}</span>}
          </Field>
        ))}

        {items.length > 0 && (
          <Field label="Nombre del archivo (opcional)">
            <Input
              type="text"
              placeholder={outputFilename?.replace(/\.[a-z0-9]+$/i, '') || 'resultado'}
              value={outputName}
              onChange={(event) => setOutputName(event.target.value)}
              disabled={submitting}
            />
          </Field>
        )}

        {success && <p className={styles.success}>PDF generado y descargado correctamente.</p>}

        {submitting && <ProgressBar value={progress} />}

        <div className={styles.actions}>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            <Download size={16} /> {submitting ? 'Procesando…' : actionLabel}
          </Button>
          {items.length > 0 && !submitting && (
            <Button variant="secondary" onClick={reset}>
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      <ErrorModal message={error} onClose={() => setError('')} />
    </div>
  )
}
