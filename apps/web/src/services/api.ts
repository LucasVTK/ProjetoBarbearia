const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
