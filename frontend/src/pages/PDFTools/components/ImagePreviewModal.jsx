import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './ImagePreviewModal.module.css'

export function ImagePreviewModal({ item, onClose }) {
  if (!item) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
        <X size={22} />
      </button>
      <figure className={styles.figure} onClick={(event) => event.stopPropagation()}>
        <img src={item.previewUrl} alt={item.file.name} className={styles.image} />
        <figcaption className={styles.caption}>{item.file.name}</figcaption>
      </figure>
    </div>,
    document.body,
  )
}
