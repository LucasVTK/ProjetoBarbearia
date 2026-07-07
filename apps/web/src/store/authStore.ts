import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, refreshAccessToken } from '../services/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  // Mostra a aba Plataforma — a autorização real é do backend
  platformAdmin?: boolean
}

interface Barbershop {
  id: string
  name: string
  slug: string
}

interface AuthState {
  user: User | null
  barbershop: Barbershop | null
  // Só em memória — nunca vai para o localStorage. A sessão durável vive
  // no cookie httpOnly do refresh token, que o JavaScript não lê.
  accessToken: string | null
  isAuthenticated: boolean
  _hydrated: boolean
  sessionChecked: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  bootstrapSession: () => Promise<void>
  setAccessToken: (accessToken: string) => void
  clearSession: () => void
  setHydrated: () => void
}

interface RegisterData {
  ownerName: string
  barbershopName: string
  email: string
  phone: string
  password: string
}

interface AuthResponse {
  accessToken: string
  user: User
  barbershop: Barbershop | null
}

// Evita bootstrap duplicado (StrictMode monta os efeitos duas vezes no dev)
let bootstrapping: Promise<void> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      barbershop: null,
      accessToken: null,
      isAuthenticated: false,
      _hydrated: false,
      sessionChecked: false,

      setHydrated: () => set({ _hydrated: true }),

      setAccessToken: (accessToken) => {
        set({ accessToken })
      },

      clearSession: () => {
        set({
          user: null,
          barbershop: null,
          accessToken: null,
          isAuthenticated: false,
          sessionChecked: true,
        })
      },

      // F5 apaga o access token da memória — renova em silêncio com o
      // cookie antes de renderizar o painel
      bootstrapSession: async () => {
        bootstrapping ??= (async () => {
          await refreshAccessToken() // sucesso seta o token; falha limpa a sessão
          set({ sessionChecked: true })
        })().finally(() => { bootstrapping = null })
        return bootstrapping
      },

      login: async (email, password) => {
        const data = await api.post<AuthResponse>('/api/auth/login', { email, password })
        set({
          user: data.user,
          barbershop: data.barbershop,
          accessToken: data.accessToken,
          isAuthenticated: true,
          sessionChecked: true,
        })
      },

      register: async (input) => {
        const data = await api.post<AuthResponse>('/api/auth/register', input)
        set({
          user: data.user,
          barbershop: data.barbershop,
          accessToken: data.accessToken,
          isAuthenticated: true,
          sessionChecked: true,
        })
      },

      logout: async () => {
        // O cookie identifica a sessão a invalidar no backend
        await api.post('/api/auth/logout', {}).catch(() => {})
        get().clearSession()
      },
    }),
    {
      name: 'barberpro-auth',
      // v1: tokens saíram do localStorage (viviam lá na v0)
      version: 1,
      migrate: (persisted) => {
        const state = persisted as Record<string, unknown> | undefined
        if (state) {
          delete state.accessToken
          delete state.refreshToken
        }
        return state as unknown as AuthState
      },
      partialize: (state) => ({
        user: state.user,
        barbershop: state.barbershop,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
