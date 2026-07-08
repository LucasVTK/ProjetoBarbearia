import { create } from 'zustand'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'barberpro-theme'

// O tema efetivo é o atributo data-theme no <html> (aplicado por um script
// inline no index.html antes do React montar, para não piscar). O store só
// espelha esse estado e cuida da troca + persistência.
function readInitialTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readInitialTheme(),

  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage bloqueado — o tema vale só para esta visita
      }
      return { theme: next }
    }),
}))
