import { PdfToolPage } from '../components/PdfToolPage'

export function WordToPDF() {
  return (
    <PdfToolPage
      title="Word a PDF"
      description="Selecciona uno o más documentos .doc o .docx, ordénalos y conviértelos en un solo PDF."
      endpoint="/word-to-pdf/"
      accept=".doc,.docx"
      minFiles={1}
      actionLabel="Convertir"
      outputFilename="documento.pdf"
    />
  )
}
