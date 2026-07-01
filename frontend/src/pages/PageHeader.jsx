import styles from './PageHeader.module.css'

export function PageHeader({ title, action }) {
  return (
    <div className={styles.header}>
      <h1>{title}</h1>
      {action}
    </div>
  )
}
