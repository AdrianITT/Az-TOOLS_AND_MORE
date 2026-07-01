import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Resumen', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/cotizaciones', label: 'Cotizaciones' },
  { to: '/usuarios', label: 'Usuarios', permiso: 'puede_gestionar_usuarios' },
]

export function Sidebar({ open, onClose }) {
  const { user } = useAuth()

  const items = NAV_ITEMS.filter((item) => !item.permiso || user?.[item.permiso])

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.brand}>AZ Cotizador</div>
        <nav className={styles.nav}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
