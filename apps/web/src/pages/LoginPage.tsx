import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">BarberPro</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">Bem-vindo de volta</h1>
          <p className="text-sm text-zinc-500 mb-6">Entre com sua conta para acessar o painel</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-mail</label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="seu@email.com" required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
