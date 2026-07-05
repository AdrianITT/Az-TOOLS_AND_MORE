import { Link } from 'react-router-dom'
import { FileImage, FileStack, FileType, Scissors, Images, LayoutGrid, Minimize2, Lock, LockOpen, FileText } from 'lucide-react'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import styles from './PDFTools.module.css'

const TOOLS = [
  {
    to: '/pdf-tools/imagenes-a-pdf',
    icon: FileImage,
    title: 'Imágenes a PDF',
    description: 'Convierte una o varias imágenes en un único PDF.',
  },
  {
    to: '/pdf-tools/unir-pdf',
    icon: FileStack,
    title: 'Unir PDFs',
    description: 'Combina varios PDFs, en el orden que elijas, en uno solo.',
  },
  {
    to: '/pdf-tools/word-a-pdf',
    icon: FileType,
    title: 'Word a PDF',
    description: 'Convierte y une documentos .doc y .docx en un único PDF.',
  },
  {
    to: '/pdf-tools/dividir-pdf',
    icon: Scissors,
    title: 'Dividir PDF',
    description: 'Separa un PDF en varios archivos, por página o por rangos.',
  },
  {
    to: '/pdf-tools/pdf-a-imagenes',
    icon: Images,
    title: 'PDF a Imágenes',
    description: 'Exporta cada página de un PDF como imagen (PNG o JPG).',
  },
  {
    to: '/pdf-tools/editar-paginas',
    icon: LayoutGrid,
    title: 'Editar páginas',
    description: 'Reordena (arrastrando), rota o elimina páginas de un PDF.',
  },
  {
    to: '/pdf-tools/comprimir-pdf',
    icon: Minimize2,
    title: 'Comprimir PDF',
    description: 'Reduce el tamaño de un PDF comprimiendo su contenido interno.',
  },
  {
    to: '/pdf-tools/proteger-pdf',
    icon: Lock,
    title: 'Proteger PDF',
    description: 'Agrega una contraseña a un PDF para proteger su acceso.',
  },
  {
    to: '/pdf-tools/desbloquear-pdf',
    icon: LockOpen,
    title: 'Desbloquear PDF',
    description: 'Elimina la contraseña de un PDF protegido.',
  },
  {
    to: '/pdf-tools/pdf-a-word',
    icon: FileText,
    title: 'PDF a Word',
    description: 'Convierte un PDF a documento .docx editable.',
  },
]

export function PDFTools() {
  return (
    <div>
      <PageHeader title="Herramientas PDF" />
      <div className={styles.grid}>
        {TOOLS.map((tool) => (
          <Link key={tool.to} to={tool.to} className={styles.link}>
            <Card className={styles.card}>
              <tool.icon size={28} strokeWidth={1.5} className={styles.icon} />
              <h3 className={styles.title}>{tool.title}</h3>
              <p className={styles.description}>{tool.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
