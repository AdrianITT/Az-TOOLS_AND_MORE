import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import styles from './DropZone.module.css'

export function DropZone({ accept, multiple = true, hint, onFiles, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return
    onFiles(Array.from(fileList))
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <UploadCloud size={32} strokeWidth={1.5} className={styles.icon} />
      <p className={styles.text}>Arrastra archivos aquí o haz clic para seleccionar</p>
      {hint && <p className={styles.hint}>{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className={styles.input}
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
