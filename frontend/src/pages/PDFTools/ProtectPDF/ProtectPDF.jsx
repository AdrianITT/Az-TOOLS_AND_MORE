import { PdfToolPage } from '../components/PdfToolPage'

export function ProtectPDF() {
  return (
    <PdfToolPage
      title="Proteger PDF con contraseña"
      description="Agrega una contraseña a un PDF para que solo quienes la conozcan puedan abrirlo."
      endpoint="/protect/"
      accept=".pdf"
      singleFile
      minFiles={1}
      actionLabel="Proteger"
      outputFilename="protegido.pdf"
      extraFields={[
        {
          name: 'password',
          label: 'Contraseña',
          type: 'password',
          placeholder: 'Ingresa una contraseña…',
          defaultValue: '',
        },
      ]}
    />
  )
}
