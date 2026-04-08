import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    ownerName: '', barbershopName: '', email: '', phone: '', password: '',
  })

  const register = useAuthStore(s => s.register)
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
      await register(form)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">BarberPro</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">Criar conta grátis</h1>
          <p className="text-sm text-zinc-500 mb-4">Configure sua barbearia em menos de 5 minutos</p>

          <div className="flex flex-col gap-1.5 mb-5 p-3 bg-zinc-800/50 rounded-lg">
            {['Agendamento online', 'Lembretes automáticos', 'Controle financeiro'].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />{item}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'ownerName',      label: 'Seu nome',             type: 'text', placeholder: 'João da Silva'        },
              { name: 'barbershopName', label: 'Nome da barbearia',    type: 'text', placeholder: 'Barbearia do João'    },
              { name: 'email',          label: 'E-mail',               type: 'email', placeholder: 'seu@email.com'       },
              { name: 'phone',          label: 'WhatsApp',             type: 'tel',  placeholder: '(11) 99999-9999'      },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">{field.label}</label>
                <input
                  type={field.type} name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange} placeholder={field.placeholder} required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Mínimo 8 caracteres" required minLength={8}
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</> : 'Criar conta grátis'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
