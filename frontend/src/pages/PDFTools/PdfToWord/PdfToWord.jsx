import { PdfToolPage } from '../components/PdfToolPage'

export function PdfToWord() {
  return (
    <PdfToolPage
      title="PDF a Word"
      description="Convierte un PDF con texto seleccionable a documento Word (.docx) editable."
      endpoint="/pdf-to-word/"
      accept=".pdf"
      singleFile
      minFiles={1}
      actionLabel="Convertir"
      outputFilename="documento.docx"
    />
  )
}
