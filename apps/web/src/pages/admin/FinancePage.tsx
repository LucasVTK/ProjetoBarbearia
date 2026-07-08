import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

type Period = 'day' | 'week' | 'month'
type AppStatus = 'DONE' | 'CANCELLED' | 'NO_SHOW'

interface Transaction {
  id: string
  date: string
  status: AppStatus
  price: string
  client: string
  service: string
}

interface TopService {
  name: string
  count: number
  revenue: number
}

interface FinanceData {
  stats: {
    revenue: number
    lost: number
    avg: number
    total: number
    done: number
    cancelled: number
    noShows: number
  }
  topServices: TopService[]
  transactions: Transaction[]
}

const statusConfig: Record<AppStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  DONE:      { icon: CheckCircle, color: 'text-green-400',  label: 'Recebido'  },
  CANCELLED: { icon: XCircle,     color: 'text-red-400',    label: 'Cancelado' },
  NO_SHOW:   { icon: AlertCircle, color: 'text-orange-400', label: 'No-show'   },
}

const periodLabels: Record<Period, string> = {
  day:   'Hoje',
  week:  'Esta semana',
  month: 'Este mês',
}

function fmt(value: number) {
  return value.toFixed(2).replace('.', ',')
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function FinancePage() {
  const token = useAuthStore(s => s.accessToken)
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData]     = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.get<FinanceData>(`/api/finance?period=${period}`, token ?? undefined)
      .then(setData)
      .catch(() => setError('Erro ao carregar dados financeiros'))
      .finally(() => setLoading(false))
  }, [period, token])

  const maxRev = data?.topServices[0]?.revenue ?? 1

  return (
    <div className="space-y-6">

      {/* Cabeçalho + seletor de período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-zinc-100">Financeiro</h1>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
          {(Object.entries(periodLabels) as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === key ? 'bg-brand-500 text-white' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : data && (
        <>
          {/* Cards principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Receita"
              value={`R$ ${fmt(data.stats.revenue)}`}
              icon={<DollarSign className="w-4 h-4" />}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Ticket médio"
              value={data.stats.done > 0 ? `R$ ${fmt(data.stats.avg)}` : '—'}
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Atendimentos"
              value={String(data.stats.done)}
              icon={<CheckCircle className="w-4 h-4" />}
              color="text-brand-400"
              bg="bg-brand-500/10"
            />
            <StatCard
              label="Perdido (cancel/no-show)"
              value={`R$ ${fmt(data.stats.lost)}`}
              icon={<TrendingDown className="w-4 h-4" />}
              color="text-red-400"
              bg="bg-red-500/10"
            />
          </div>

          {/* Serviços mais realizados */}
          {data.topServices.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-100 mb-4">Serviços mais realizados</h2>
              <div className="space-y-3">
                {data.topServices.map(s => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{s.count}×</span>
                        <span className="text-sm font-semibold text-zinc-100">R$ {fmt(s.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${(s.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extrato */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Extrato</h2>
              <span className="text-xs text-zinc-500">{data.transactions.length} lançamento{data.transactions.length !== 1 ? 's' : ''}</span>
            </div>

            {data.transactions.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 text-sm">
                Nenhum lançamento neste período
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {data.transactions.map(t => {
                  const cfg = statusConfig[t.status]
                  const Icon = cfg.icon
                  const price = parseFloat(String(t.price))
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{t.client}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {t.service} · {formatDate(t.date)} {formatTime(t.date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${t.status === 'DONE' ? 'text-zinc-100' : 'text-zinc-600 line-through'}`}>
                          R$ {fmt(price)}
                        </p>
                        <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: string
  icon: React.ReactNode; color: string; bg: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
