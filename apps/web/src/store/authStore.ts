import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Barbershop {
  id: string
  name: string
  slug: string
}

interface AuthState {
  user: User | null
  barbershop: Barbershop | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  _hydrated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  setTokens: (accessToken: string, refreshToken: string) => void
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
  refreshToken: string
  user: User
  barbershop: Barbershop | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      barbershop: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hydrated: false,

      setHydrated: () => set({ _hydrated: true }),

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken })
      },

      clearSession: () => {
        set({
          user: null,
          barbershop: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      login: async (email, password) => {
        const data = await api.post<AuthResponse>('/api/auth/login', { email, password })
        set({
          user: data.user,
          barbershop: data.barbershop,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        })
      },

      register: async (input) => {
        const data = await api.post<AuthResponse>('/api/auth/register', input)
        set({
          user: data.user,
          barbershop: data.barbershop,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        const { refreshToken, clearSession } = get()
        if (refreshToken) {
          // Notifica o backend para invalidar o token
          await api.post('/api/auth/logout', { refreshToken }).catch(() => {})
        }
        clearSession()
      },
    }),
    {
      name: 'barberpro-auth',
      partialize: (state) => ({
        user: state.user,
        barbershop: state.barbershop,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
