import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { initSession, setOnUnauthorized, setToken, getBaseUrl } from '../api/client'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [cargando, setCargando] = useState(true)
  const [logueado, setLogueado] = useState(false)
  const [usuario, setUsuario] = useState(null)
  const [hayServidor, setHayServidor] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    initSession().then(({ baseUrl, token }) => {
      setHayServidor(Boolean(baseUrl))
      setLogueado(Boolean(token))
      setCargando(false)
      if (token) authApi.me().then(setUsuario).catch(() => {})
    })
  }, [])

  useEffect(() => {
    // Un 401 en cualquier request cierra la sesión local
    setOnUnauthorized(async () => {
      await setToken(null)
      setUsuario(null)
      setLogueado(false)
      queryClient.clear()
    })
    return () => setOnUnauthorized(null)
  }, [queryClient])

  const value = useMemo(
    () => ({
      cargando,
      logueado,
      usuario,
      hayServidor,
      marcarServidor: () => setHayServidor(Boolean(getBaseUrl())),

      async login(username, password) {
        const { token } = await authApi.login(username, password)
        await setToken(token)
        setLogueado(true)
        authApi.me().then(setUsuario).catch(() => {})
      },

      async logout() {
        // Revocar en servidor (best-effort) y limpiar siempre lo local
        try {
          await authApi.logout()
        } catch {
          // sin red o token ya inválido: igual se cierra la sesión local
        }
        await setToken(null)
        setUsuario(null)
        setLogueado(false)
        queryClient.clear()
      },
    }),
    [cargando, logueado, usuario, hayServidor, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
