import styles from './ProgressBar.module.css'

export function ProgressBar({ value }) {
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${value}%` }} />
      <span className={styles.label}>{value}%</span>
    </div>
  )
}
