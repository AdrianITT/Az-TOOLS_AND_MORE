import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Package, FileText, Wallet, QrCode, UserCog, TrendingUp, FileStack, Building2, MapPin } from 'lucide-react'
import { api } from '../../api/client'
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

  // Badge de vencimientos urgentes (≤7 días): la información con fecha límite
  // busca al usuario, no espera a que abra el dashboard.
  const [vencimientosUrgentes, setVencimientosUrgentes] = useState(0)
  useEffect(() => {
    let activo = true
    function cargar() {
      api
        .get('/finanzas/deudas/proximos-vencimientos/', { dias: 7 })
        .then((data) => {
          if (activo) setVencimientosUrgentes((data.results ?? data).length)
        })
        .catch(() => {})
    }
    cargar()
    const intervalo = setInterval(cargar, 10 * 60 * 1000) // refresco cada 10 min
    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [])

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
                  {item.to === '/finanzas' && vencimientosUrgentes > 0 && (
                    <span
                      title={`${vencimientosUrgentes} pago(s) vencen en los próximos 7 días`}
                      style={{
                        marginLeft: 'auto', background: '#e74c3c', color: 'white',
                        borderRadius: 999, fontSize: 11, fontWeight: 700,
                        minWidth: 18, height: 18, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                      }}
                    >
                      {vencimientosUrgentes}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
