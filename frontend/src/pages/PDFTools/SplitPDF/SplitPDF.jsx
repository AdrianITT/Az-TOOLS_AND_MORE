import { PdfToolPage } from '../components/PdfToolPage'

export function SplitPDF() {
  return (
    <PdfToolPage
      title="Dividir PDF"
      description="Selecciona un PDF y divídelo en varios archivos. Deja el rango vacío para obtener un PDF por cada página."
      endpoint="/split/"
      accept="application/pdf"
      minFiles={1}
      singleFile
      actionLabel="Dividir PDF"
      outputFilename="dividido.zip"
      extraFields={[
        {
          name: 'ranges',
          label: 'Rangos de páginas (opcional)',
          type: 'text',
          placeholder: 'ej. 1-3,4-6',
          hint: 'Un archivo por rango indicado. Vacío = un archivo por página.',
        },
      ]}
    />
  )
}
