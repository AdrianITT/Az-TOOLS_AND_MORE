import styles from './Input.module.css'

export function Field({ label, hint, error, children }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </label>
  )
}

export function Input(props) {
  return <input className={styles.input} {...props} />
}

export function Select({ children, ...props }) {
  return (
    <select className={styles.input} {...props}>
      {children}
    </select>
  )
}
