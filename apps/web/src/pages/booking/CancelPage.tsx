import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Scissors, Calendar, AlertTriangle, XCircle, CheckCircle, Loader2 } from 'lucide-react'
import { api } from '../../services/api'

interface Appointment {
  id: string
  date: string
  endTime: string
  status: string
  price: string
  service:      { name: string; duration: number }
  professional: { name: string }
  barbershop:   { name: string }
  client:       { name: string }
}

function canCancel(date: string): boolean {
  const diffHours = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60)
  return diffHours >= 2
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CancelPage() {
  const { token } = useParams<{ token: string }>()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling]   = useState(false)
  const [cancelled, setCancelled]     = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!token) return
    api.get<Appointment>(`/api/appointments/cancel/${token}`)
      .then(setAppointment)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCancel() {
    if (!token) return
    setCancelling(true)
    try {
      await api.post(`/api/appointments/cancel/${token}`, {})
      setCancelled(true)
      setConfirmOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
      setConfirmOpen(false)
    } finally {
      setCancelling(false)
    }
  }

  // Carregando
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  // Token inválido
  if (notFound || !appointment) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">Link inválido</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Este link de cancelamento não existe ou já expirou.
          </p>
          <Link to="/" className="text-sm text-brand-500 hover:text-brand-400 transition-colors">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Já encerrado
  if (['CANCELLED', 'DONE', 'NO_SHOW'].includes(appointment.status) || cancelled) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
        <div className="text-center max-w-xs">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            cancelled || appointment.status === 'CANCELLED'
              ? 'bg-green-500/10' : 'bg-zinc-800'
          }`}>
            <CheckCircle className={`w-7 h-7 ${
              cancelled || appointment.status === 'CANCELLED' ? 'text-green-400' : 'text-zinc-500'
            }`} />
          </div>
          <h2 className="text-lg font-bold text-zinc-100 mb-2">
            {cancelled ? 'Agendamento cancelado' : 'Este agendamento já foi encerrado'}
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            {cancelled
              ? 'Seu horário foi liberado. Esperamos te ver em breve!'
              : `Status atual: ${appointment.status}`}
          </p>
          <Link to="/" className="inline-block bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Fazer novo agendamento
          </Link>
        </div>
      </div>
    )
  }

  const ok = canCancel(appointment.date)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col max-w-lg mx-auto px-5 py-8">

      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-100 transition-colors mb-4">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold text-zinc-100">Meu agendamento</h1>
        <p className="text-sm text-zinc-500 mt-1">{appointment.barbershop.name}</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-brand-500" />
            <p className="text-base font-bold text-zinc-100">{appointment.service.name}</p>
            <span className="ml-auto text-base font-bold text-zinc-100">
              R$ {parseFloat(appointment.price).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-zinc-400">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(appointment.date)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(appointment.date)} com {appointment.professional.name}
            </span>
          </div>
        </div>

        {/* Política */}
        <div className={`px-4 py-3 border-t flex items-start gap-2 ${
          ok ? 'bg-orange-500/5 border-orange-500/20' : 'bg-red-500/5 border-red-500/20'
        }`}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${ok ? 'text-orange-400' : 'text-red-400'}`} />
          <p className={`text-xs leading-relaxed ${ok ? 'text-orange-300/80' : 'text-red-400'}`}>
            {ok
              ? <>Cancelamentos gratuitos até <strong>2 horas antes</strong>. Após esse prazo o valor poderá ser cobrado.</>
              : <>Prazo de cancelamento encerrado. O valor do serviço poderá ser cobrado normalmente.</>
            }
          </p>
        </div>

        <div className="px-4 py-3 border-t border-zinc-800">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!ok}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              ok
                ? 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20'
                : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-800'
            }`}>
            <XCircle className="w-4 h-4" />
            {ok ? 'Cancelar agendamento' : 'Cancelamento não disponível'}
          </button>
        </div>
      </div>

      {/* Modal confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="px-5 py-5">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Confirmar cancelamento?</h3>
              <p className="text-sm text-zinc-400">
                <strong className="text-zinc-100">{appointment.service.name}</strong> — {formatTime(appointment.date)},{' '}
                {formatDate(appointment.date)}
              </p>
              <p className="text-xs text-zinc-600 mt-3 leading-relaxed">
                Esta ação não pode ser desfeita. Seu horário ficará disponível para outros clientes.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-medium hover:border-zinc-600 transition-colors">
                Voltar
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</> : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
