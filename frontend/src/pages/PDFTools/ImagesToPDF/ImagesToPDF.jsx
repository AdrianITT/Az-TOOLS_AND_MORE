import { PdfToolPage } from '../components/PdfToolPage'

export function ImagesToPDF() {
  return (
    <PdfToolPage
      title="Imágenes a PDF"
      description="Selecciona una o más imágenes, ordénalas y genera un único PDF."
      endpoint="/images-to-pdf/"
      accept="image/jpeg,image/png,image/webp"
      minFiles={1}
      withPreview
      actionLabel="Generar PDF"
      outputFilename="imagenes.pdf"
    />
  )
}
