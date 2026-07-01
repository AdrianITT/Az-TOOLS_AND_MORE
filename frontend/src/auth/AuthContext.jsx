import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!token)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me/')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function login(username, password) {
    const data = await api.post('/auth/login/', { username, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    if (data.user) setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  function setUserData(data) {
    setUser(data)
  }

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    hasOrganization: !!user?.organization,
    login,
    logout,
    setUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
