import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import styles from './ErrorModal.module.css'

export function ErrorModal({ message, onClose }) {
  return (
    <Modal open={Boolean(message)} title="No se pudo procesar" onClose={onClose}>
      <div className={styles.content}>
        <AlertTriangle size={22} className={styles.icon} />
        <p className={styles.message}>{message}</p>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </Modal>
  )
}
