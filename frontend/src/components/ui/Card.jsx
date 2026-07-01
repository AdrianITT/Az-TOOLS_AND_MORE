import styles from './Card.module.css'

export function Card({ className = '', ...props }) {
  return <div className={`${styles.card} ${className}`} {...props} />
}
