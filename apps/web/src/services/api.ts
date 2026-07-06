import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

// Compartilhado entre chamadas simultâneas: se várias requisições receberem
// 401 ao mesmo tempo, só uma tentativa de refresh é feita
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clearSession } = useAuthStore.getState()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error('refresh falhou')

    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    setTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } catch {
    // Sessão realmente expirou — limpa o estado e o ProtectedRoute
    // redireciona para o login
    clearSession()
    return null
  }
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Access token expirou (dura 15min) — renova com o refresh token e
  // repete a requisição uma única vez
  if (res.status === 401 && token && !isRetry && !path.startsWith('/api/auth/')) {
    refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
    const newToken = await refreshPromise
    if (newToken) {
      return request<T>(path, { ...options, token: newToken }, true)
    }
  }

  if (res.status === 204) return undefined as T

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? 'Erro desconhecido')
  }

  return data as T
}

export const api = {
  get:    <T>(path: string, token?: string)              => request<T>(path, { method: 'GET', token }),
  post:   <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'POST', body, token }),
  put:    <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'PUT', body, token }),
  patch:  <T>(path: string, body: unknown, token?: string) => request<T>(path, { method: 'PATCH', body, token }),
  delete: <T>(path: string, token?: string)              => request<T>(path, { method: 'DELETE', token }),
}
