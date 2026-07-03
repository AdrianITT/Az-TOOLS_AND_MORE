import { Fragment, useState } from 'react'
import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, X } from 'lucide-react'
import { ImagePreviewModal } from './ImagePreviewModal'
import styles from './FileList.module.css'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileList({ items, onRemove, onMove, disabled }) {
  const [previewItem, setPreviewItem] = useState(null)

  if (items.length === 0) return null

  return (
    <Fragment>
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.item}>
            {item.previewUrl ? (
              <button
                type="button"
                className={styles.thumbButton}
                onClick={() => setPreviewItem(item)}
                aria-label={`Ver ${item.file.name} en grande`}
              >
                <img src={item.previewUrl} alt="" className={styles.thumb} />
              </button>
            ) : (
              <div className={styles.iconThumb}>
                {item.file.type.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
              </div>
            )}
            <div className={styles.info}>
              <span className={styles.name}>{item.file.name}</span>
              <span className={styles.size}>{formatSize(item.file.size)}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconButton}
                disabled={disabled || index === 0}
                onClick={() => onMove(index, index - 1)}
                aria-label="Mover arriba"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                disabled={disabled || index === items.length - 1}
                onClick={() => onMove(index, index + 1)}
                aria-label="Mover abajo"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                aria-label="Eliminar"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ImagePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </Fragment>
  )
}
