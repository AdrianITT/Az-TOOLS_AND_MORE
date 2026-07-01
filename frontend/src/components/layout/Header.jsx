import { useAuth } from '../../auth/AuthContext'
import styles from './Header.module.css'

export function Header({ onMenuClick }) {
  const { user, logout } = useAuth()

  return (
    <header className={styles.header}>
      <button className={styles.menuButton} type="button" onClick={onMenuClick} aria-label="Abrir menú">
        ☰
      </button>
      <div className={styles.spacer} />
      <span className={styles.user}>{user?.first_name || user?.username}</span>
      <button className={styles.logout} type="button" onClick={logout}>
        Salir
      </button>
    </header>
  )
}
