import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useThemeStore()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={`text-zinc-400 hover:text-zinc-100 transition-colors ${className}`}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
