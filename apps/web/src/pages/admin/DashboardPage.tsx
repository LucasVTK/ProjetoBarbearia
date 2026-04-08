import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, DollarSign, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Scissors, Loader2 } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

type AppStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'NO_SHOW'

interface TodayAppointment {
  id: string
  date: string
  status: AppStatus
  price: string
  client: string
  service: string
  professional: string
}

interface DashboardData {
  today: {
    total: number
    done: number
    pending: number
    revenue: number
    clients: number
  }
  month: {
    revenue: number
    done: number
    avgTicket: number
  }
  appointments: TodayAppointment[]
}

const statusConfig: Record<AppStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  PENDING:     { label: 'Aguardando',  icon: Clock,        color: 'text-zinc-400'   },
  CONFIRMED:   { label: 'Confirmado',  icon: CheckCircle,  color: 'text-blue-400'   },
  IN_PROGRESS: { label: 'Em atend.',   icon: Scissors,     color: 'text-brand-400'  },
  DONE:        { label: 'Concluído',   icon: CheckCircle,  color: 'text-green-400'  },
  CANCELLED:   { label: 'Cancelado',   icon: XCircle,      color: 'text-red-400'    },
  NO_SHOW:     { label: 'Não veio',    icon: AlertCircle,  color: 'text-orange-400' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmt(value: number) {
  return value.toFixed(2).replace('.', ',')
}

export function DashboardPage() {
  const token = useAuthStore(s => s.accessToken)
  const [data, setData]     = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    api.get<DashboardData>('/api/dashboard', token ?? undefined)
      .then(setData)
      .catch(() => setError('Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        {error || 'Erro desconhecido'}
      </div>
    )
  }

  const stats = [
    {
      label: 'Agendamentos hoje',
      value: String(data.today.total),
      sub: `${data.today.pending} pendente${data.today.pending !== 1 ? 's' : ''}`,
      icon: Calendar,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Faturamento hoje',
      value: `R$ ${fmt(data.today.revenue)}`,
      sub: `${data.today.done} atendimento${data.today.done !== 1 ? 's' : ''} concluído${data.today.done !== 1 ? 's' : ''}`,
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Clientes atendidos',
      value: String(data.today.clients),
      sub: 'Hoje',
      icon: Users,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Ticket médio',
      value: `R$ ${fmt(data.month.avgTicket)}`,
      sub: 'Este mês',
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 capitalize">{today}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
              <p className="text-xs text-zinc-600 mt-1">{stat.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Agenda do dia */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Agenda de hoje</h2>
          <Link to="/admin/agenda" className="text-xs text-brand-500 hover:text-brand-400 transition-colors">
            Ver completa →
          </Link>
        </div>

        {data.appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-600 text-sm">
            <Clock className="w-6 h-6 mb-2" />
            Nenhum agendamento hoje
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {data.appointments.map(apt => {
              const cfg = statusConfig[apt.status]
              const StatusIcon = cfg.icon
              return (
                <div
                  key={apt.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${
                    apt.status === 'IN_PROGRESS' ? 'bg-brand-500/5' : ''
                  }`}
                >
                  <span className="text-sm font-mono text-zinc-400 w-12 flex-shrink-0">
                    {formatTime(apt.date)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{apt.client}</p>
                    <p className="text-xs text-zinc-500 truncate">{apt.service}</p>
                  </div>

                  <div className={`flex items-center gap-1 ${cfg.color} flex-shrink-0`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="text-xs hidden sm:inline">{cfg.label}</span>
                  </div>

                  <span className="text-sm font-medium text-zinc-300 flex-shrink-0 w-16 text-right">
                    R$ {fmt(parseFloat(String(apt.price)))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
