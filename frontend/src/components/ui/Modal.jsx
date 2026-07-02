import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

export function Modal({ open, title, onClose, children }) {
  if (!open) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
