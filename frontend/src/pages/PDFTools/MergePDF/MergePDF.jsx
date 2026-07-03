import { PdfToolPage } from '../components/PdfToolPage'

export function MergePDF() {
  return (
    <PdfToolPage
      title="Unir PDFs"
      description="Selecciona dos o más PDFs, ordénalos y únelos en un solo documento."
      endpoint="/merge/"
      accept="application/pdf"
      minFiles={2}
      actionLabel="Unir PDF"
      outputFilename="unido.pdf"
    />
  )
}
