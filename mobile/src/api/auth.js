import { api } from './client'

export function login(username, password) {
  return api.post('/auth/login/', { username, password })
}

export function me() {
  return api.get('/auth/me/')
}

export function logout() {
  return api.post('/auth/logout/')
}
