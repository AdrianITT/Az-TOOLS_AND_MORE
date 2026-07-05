import { PdfToolPage } from '../components/PdfToolPage'

export function UnlockPDF() {
  return (
    <PdfToolPage
      title="Quitar contraseña de PDF"
      description="Elimina la contraseña de un PDF protegido para acceder libremente a él."
      endpoint="/unlock/"
      accept=".pdf"
      singleFile
      minFiles={1}
      actionLabel="Desbloquear"
      outputFilename="desbloqueado.pdf"
      extraFields={[
        {
          name: 'password',
          label: 'Contraseña actual del PDF',
          type: 'password',
          placeholder: 'Contraseña del PDF…',
          defaultValue: '',
        },
      ]}
    />
  )
}
