import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { api } from './api/client'
import { useAuth } from './auth/AuthContext'
import { applyOrgTheme } from './utils/theme'
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
import { ServicioForm } from './pages/Servicios/ServicioForm'
import { Cotizaciones } from './pages/Cotizaciones/Cotizaciones'
import { CotizacionForm } from './pages/Cotizaciones/CotizacionForm'
import { Usuarios } from './pages/Usuarios/Usuarios'
import { Finanzas } from './pages/Finanzas/Finanzas'
import { FibrasCatalogo } from './pages/Fibras/FibrasCatalogo'
import { FibraDetalle } from './pages/Fibras/FibraDetalle'
import { SimulacionForm } from './pages/Fibras/SimulacionForm'
import { Historial as HistorialFibras } from './pages/Fibras/Historial'
import { QR } from './pages/QR/QR'
import { PDFTools } from './pages/PDFTools/PDFTools'
import { ImagesToPDF } from './pages/PDFTools/ImagesToPDF/ImagesToPDF'
import { MergePDF } from './pages/PDFTools/MergePDF/MergePDF'
import { WordToPDF } from './pages/PDFTools/WordToPDF/WordToPDF'
import { SplitPDF } from './pages/PDFTools/SplitPDF/SplitPDF'
import { PdfToImages } from './pages/PDFTools/PdfToImages/PdfToImages'
import { EditPages } from './pages/PDFTools/EditPages/EditPages'
import { Organizacion } from './pages/Organizacion/Organizacion'
import { Sucursales } from './pages/Sucursales/Sucursales'

function App() {
  const { hasOrganization } = useAuth()

  useEffect(() => {
    if (!hasOrganization) return
    api.get('/organizacion/').then(applyOrgTheme).catch(() => {})
  }, [hasOrganization])

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
            <Route path="/servicios/nuevo" element={<ServicioForm />} />
            <Route path="/servicios/:id" element={<ServicioForm />} />
            <Route path="/cotizaciones" element={<Cotizaciones />} />
            <Route path="/cotizaciones/nueva" element={<CotizacionForm />} />
            <Route path="/cotizaciones/:id" element={<CotizacionForm />} />
            <Route path="/finanzas" element={<Finanzas />} />
            <Route path="/finanzas/fibras" element={<FibrasCatalogo />} />
            <Route path="/finanzas/fibras/simular" element={<SimulacionForm />} />
            <Route path="/finanzas/fibras/historial" element={<HistorialFibras />} />
            <Route path="/finanzas/fibras/:ticker" element={<FibraDetalle />} />
            <Route path="/qr" element={<QR />} />
            <Route path="/pdf-tools" element={<PDFTools />} />
            <Route path="/pdf-tools/imagenes-a-pdf" element={<ImagesToPDF />} />
            <Route path="/pdf-tools/unir-pdf" element={<MergePDF />} />
            <Route path="/pdf-tools/word-a-pdf" element={<WordToPDF />} />
            <Route path="/pdf-tools/dividir-pdf" element={<SplitPDF />} />
            <Route path="/pdf-tools/pdf-a-imagenes" element={<PdfToImages />} />
            <Route path="/pdf-tools/editar-paginas" element={<EditPages />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/organizacion" element={<Organizacion />} />
            <Route path="/sucursales" element={<Sucursales />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
