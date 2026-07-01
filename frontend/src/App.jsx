import { Route, Routes } from 'react-router-dom'
import {
  ProtectedRoute,
  RequireOrg,
  RedirectIfHasOrg,
  RedirectIfAuthenticated,
} from './routes/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/Login/Login'
import { OnboardingHome } from './pages/Onboarding/OnboardingHome'
import { CrearOrganizacion } from './pages/Onboarding/CrearOrganizacion'
import { AceptarInvitacion } from './pages/AceptarInvitacion/AceptarInvitacion'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Clientes } from './pages/Clientes/Clientes'
import { Servicios } from './pages/Servicios/Servicios'
import { Cotizaciones } from './pages/Cotizaciones/Cotizaciones'
import { Usuarios } from './pages/Usuarios/Usuarios'

function App() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route path="/invitaciones/aceptar/:token" element={<AceptarInvitacion />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RedirectIfHasOrg />}>
          <Route path="/onboarding" element={<OnboardingHome />} />
          <Route path="/onboarding/crear" element={<CrearOrganizacion />} />
        </Route>

        <Route element={<RequireOrg />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/cotizaciones" element={<Cotizaciones />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
