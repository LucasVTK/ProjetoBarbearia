import { useAuthStore } from '../store/authStore'

// Mesma origem: em produção o proxy do Vercel repassa /api para a API;
// no dev o proxy do Vite faz o mesmo. Assim o cookie httpOnly do refresh
// token é first-party em qualquer navegador (inclusive Safari).
// Em produção a origem própria é obrigatória (senão o cookie SameSite=Lax
// não trafega) — VITE_API_URL só vale como override no dev.
const BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? '')

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

// Compartilhado entre chamadas simultâneas: se várias requisições receberem
// 401 ao mesmo tempo, só uma tentativa de refresh é feita
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { setAccessToken, clearSession } = useAuthStore.getState()

  try {
    // O refresh token vai no cookie httpOnly — nada no body
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) throw new Error('refresh falhou')

    const data = (await res.json()) as { accessToken: string }
    setAccessToken(data.accessToken)
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
    credentials: 'include', // envia o cookie de sessão nas rotas de auth
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

export { refreshAccessToken }
