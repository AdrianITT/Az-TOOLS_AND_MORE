import { PdfToolPage } from '../components/PdfToolPage'

export function CompressPDF() {
  return (
    <PdfToolPage
      title="Comprimir PDF"
      description="Reduce el tamaño de un PDF comprimiendo su contenido interno."
      endpoint="/compress/"
      accept=".pdf"
      singleFile
      minFiles={1}
      actionLabel="Comprimir"
      outputFilename="comprimido.pdf"
    />
  )
}
