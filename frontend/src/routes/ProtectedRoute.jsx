import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}

export function RequireOrg() {
  const { hasOrganization, loading } = useAuth()

  if (loading) return null
  if (!hasOrganization) return <Navigate to="/onboarding" replace />

  return <Outlet />
}

export function RedirectIfHasOrg() {
  const { hasOrganization, loading } = useAuth()

  if (loading) return null
  if (hasOrganization) return <Navigate to="/" replace />

  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const { isAuthenticated, hasOrganization, loading } = useAuth()

  if (loading) return null
  if (isAuthenticated) return <Navigate to={hasOrganization ? '/' : '/onboarding'} replace />

  return <Outlet />
}
