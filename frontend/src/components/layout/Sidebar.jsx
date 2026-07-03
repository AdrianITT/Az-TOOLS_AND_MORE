import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Package, FileText, Wallet, QrCode, UserCog, TrendingUp, FileStack, Building2, MapPin } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import styles from './Sidebar.module.css'

const NAV_GROUPS = [
  {
    label: 'General',
    items: [{ to: '/', label: 'Resumen', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/servicios', label: 'Servicios', icon: Package },
      { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/finanzas', label: 'Finanzas', icon: Wallet },
      { to: '/finanzas/fibras', label: 'FIBRAs', icon: TrendingUp },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/qr', label: 'Códigos QR', icon: QrCode },
      { to: '/pdf-tools', label: 'Herramientas PDF', icon: FileStack },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: UserCog, permiso: 'puede_gestionar_usuarios' },
      { to: '/organizacion', label: 'Mi organización', icon: Building2, permiso: 'puede_gestionar_usuarios' },
      { to: '/sucursales', label: 'Sucursales', icon: MapPin, permiso: 'puede_gestionar_usuarios' },
    ],
  },
]

export function Sidebar({ open, onClose }) {
  const { user } = useAuth()

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permiso || user?.[item.permiso]),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.brand}>AZ Cotizador</div>
        <nav className={styles.nav}>
          {groups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                >
                  <item.icon size={17} strokeWidth={2} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
