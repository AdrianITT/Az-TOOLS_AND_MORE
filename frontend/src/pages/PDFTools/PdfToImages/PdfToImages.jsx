import { PdfToolPage } from '../components/PdfToolPage'

export function PdfToImages() {
  return (
    <PdfToolPage
      title="PDF a Imágenes"
      description="Selecciona un PDF y exporta cada página como una imagen. Recibirás un .zip con todas las páginas."
      endpoint="/pdf-to-images/"
      accept="application/pdf"
      minFiles={1}
      singleFile
      actionLabel="Convertir"
      outputFilename="imagenes.zip"
      extraFields={[
        {
          name: 'format',
          label: 'Formato de imagen',
          type: 'select',
          defaultValue: 'png',
          options: [
            { value: 'png', label: 'PNG' },
            { value: 'jpg', label: 'JPG' },
          ],
        },
      ]}
    />
  )
}
