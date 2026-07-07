import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, User, Scissors, CheckCircle, XCircle, AlertCircle, Loader2, Phone } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

function parseDateParam(param: string | null): Date | null {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null
  const [y, m, d] = param.split('-').map(Number)
  return new Date(y, m - 1, d)
}

type Status = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'NO_SHOW'

interface Appointment {
  id: string
  date: string
  endTime: string
  status: Status
  price: string
  client:       { name: string; phone: string }
  service:      { name: string; duration: number }
  professional: { name: string }
}

const statusConfig: Record<Status, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  PENDING:     { label: 'Aguardando',  color: 'text-zinc-400',   bg: 'bg-zinc-700/40',   icon: Clock       },
  CONFIRMED:   { label: 'Confirmado',  color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: CheckCircle },
  IN_PROGRESS: { label: 'Em atend.',   color: 'text-brand-400',  bg: 'bg-brand-500/10',  icon: Scissors    },
  DONE:        { label: 'Concluído',   color: 'text-green-400',  bg: 'bg-green-500/10',  icon: CheckCircle },
  CANCELLED:   { label: 'Cancelado',   color: 'text-red-400',    bg: 'bg-red-500/10',    icon: XCircle     },
  NO_SHOW:     { label: 'Não veio',    color: 'text-orange-400', bg: 'bg-orange-500/10', icon: AlertCircle },
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isToday(date: Date) {
  return toDateString(date) === toDateString(new Date())
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function calcDuration(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

export function AgendaPage() {
  const { accessToken } = useAuthStore()
  const [searchParams, setSearchParams]   = useSearchParams()
  const [selectedDate, setSelectedDate]   = useState(() => parseDateParam(searchParams.get('date')) ?? new Date())
  const [appointments, setAppointments]   = useState<Appointment[]>([])
  const [selected, setSelected]           = useState<Appointment | null>(null)
  // Cancelar é definitivo (cliente é avisado no WhatsApp e não dá para
  // reabrir) — exige confirmação explícita antes de aplicar
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null)
  const [highlightId, setHighlightId]     = useState<string | null>(() => searchParams.get('highlight'))
  const [loading, setLoading]             = useState(true)
  const [updating, setUpdating]           = useState(false)
  const [error, setError]                 = useState('')

  // Clique em notificação com a agenda já aberta → troca dia e destaque
  useEffect(() => {
    const date = parseDateParam(searchParams.get('date'))
    if (date) setSelectedDate(date)
    const highlight = searchParams.get('highlight')
    if (highlight) setHighlightId(highlight)
  }, [searchParams])

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const data = await api.get<Appointment[]>(
        `/api/appointments?date=${toDateString(selectedDate)}`,
        accessToken ?? undefined
      )
      setAppointments(data)
    } catch {
      if (!silent) setError('Erro ao carregar agendamentos')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedDate, accessToken])

  // Carrega ao abrir/trocar de dia + atualiza sozinha a cada 15s
  // (agendamentos novos aparecem sem precisar dar refresh)
  useEffect(() => {
    fetchAppointments()
    const interval = setInterval(() => fetchAppointments(true), 15_000)
    return () => clearInterval(interval)
  }, [fetchAppointments])

  // Quando a lista carrega com um destaque pendente, abre os detalhes
  // do agendamento e rola até o card
  useEffect(() => {
    if (!highlightId || loading) return
    const apt = appointments.find(a => a.id === highlightId)
    if (apt) {
      setSelected(apt)
      setTimeout(() => {
        document.getElementById(`apt-${apt.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
    setHighlightId(null)
    setSearchParams({}, { replace: true }) // limpa a URL p/ não reabrir no refresh
  }, [highlightId, loading, appointments, setSearchParams])

  async function changeStatus(id: string, status: Status) {
    setUpdating(true)
    try {
      const updated = await api.patch<Appointment>(
        `/api/appointments/${id}`,
        { status },
        accessToken ?? undefined
      )
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: updated.status } : a))
      setSelected(prev => prev?.id === id ? { ...prev, status: updated.status } : prev)
    } catch (err) {
      // A API explica por que a transição foi recusada
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status')
      setSelected(null) // fecha o modal para o aviso ficar visível
    } finally {
      setUpdating(false)
    }
  }

  const summary = {
    total:   appointments.length,
    done:    appointments.filter(a => a.status === 'DONE').length,
    pending: appointments.filter(a => ['PENDING', 'CONFIRMED'].includes(a.status)).length,
    revenue: appointments
      .filter(a => a.status === 'DONE')
      .reduce((s, a) => s + parseFloat(a.price), 0),
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Agenda</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Seletor de data */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedDate(d => addDays(d, -1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-white capitalize">{formatDate(selectedDate)}</p>
            {isToday(selectedDate) && (
              <span className="text-xs text-brand-500 font-medium">Hoje</span>
            )}
          </div>

          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mini resumo do dia */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Total',      value: summary.total   },
            { label: 'Concluídos', value: summary.done    },
            { label: 'Pendentes',  value: summary.pending },
            { label: 'Receita',    value: `R$\u00a0${summary.revenue.toFixed(2).replace('.', ',')}` },
          ].map(item => (
            <div key={item.label} className="bg-zinc-800/50 rounded-lg py-2">
              <p className="text-sm font-bold text-white">{item.value}</p>
              <p className="text-xs text-zinc-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm">Nenhum agendamento neste dia</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map(apt => {
            const cfg = statusConfig[apt.status]
            const StatusIcon = cfg.icon
            const isActive = apt.status === 'IN_PROGRESS'
            const duration = calcDuration(apt.date, apt.endTime)

            return (
              <button
                key={apt.id}
                id={`apt-${apt.id}`}
                onClick={() => setSelected(apt)}
                className={`w-full text-left bg-zinc-900 border rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all hover:border-zinc-700 ${
                  isActive ? 'border-brand-500/50' : 'border-zinc-800'
                } ${selected?.id === apt.id ? 'ring-1 ring-brand-500/30' : ''}`}
              >
                <div className="text-center w-12 flex-shrink-0">
                  <p className="text-sm font-mono font-semibold text-white">{formatTime(apt.date)}</p>
                  <p className="text-xs text-zinc-600">{duration}min</p>
                </div>

                <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${isActive ? 'bg-brand-500' : 'bg-zinc-800'}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{apt.client.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{apt.service.name}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    R$ {parseFloat(apt.price).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal de detalhes */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-white">Detalhes</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <Row icon={<User className="w-4 h-4" />}     label="Cliente"  value={selected.client.name} />
              <Row icon={<Phone className="w-4 h-4" />}    label="Telefone" value={selected.client.phone} />
              <Row icon={<Clock className="w-4 h-4" />}    label="Horário"  value={`${formatTime(selected.date)} · ${calcDuration(selected.date, selected.endTime)} min`} />
              <Row icon={<Scissors className="w-4 h-4" />} label="Serviço"  value={selected.service.name} />
              <Row icon={<span className="text-xs font-bold text-zinc-400">R$</span>} label="Valor" value={`R$ ${parseFloat(selected.price).toFixed(2).replace('.', ',')}`} />

              <div className="pt-1">
                <p className="text-xs text-zinc-500 mb-2">Status atual</p>
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${statusConfig[selected.status].bg} ${statusConfig[selected.status].color}`}>
                  {statusConfig[selected.status].label}
                </span>
              </div>

              {/* Cancelado é definitivo — a API recusa qualquer alteração */}
              {selected.status === 'CANCELLED' ? (
                <p className="text-xs text-zinc-600 italic pt-2">
                  Agendamento cancelado não pode ser alterado. Peça ao cliente para agendar novamente.
                </p>
              ) : (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">Alterar status</p>
                  <span className="text-xs text-zinc-600 italic">Correções permitidas</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { status: 'CONFIRMED',   color: 'blue',   label: 'Confirmar'   },
                      { status: 'IN_PROGRESS', color: 'orange', label: 'Iniciar'     },
                      { status: 'DONE',        color: 'green',  label: '✓ Concluído' },
                      { status: 'PENDING',     color: 'zinc',   label: 'Reabrir'     },
                      { status: 'NO_SHOW',     color: 'zinc',   label: 'Não veio'    },
                      { status: 'CANCELLED',   color: 'red',    label: 'Cancelar'    },
                    ] as { status: Status; color: keyof typeof colorMap; label: string }[]
                  )
                    .filter(opt => opt.status !== selected.status)
                    .map(opt => (
                      <ActionBtn
                        key={opt.status}
                        color={opt.color}
                        disabled={updating}
                        onClick={() => opt.status === 'CANCELLED'
                          ? setConfirmCancel(selected)
                          : changeStatus(selected.id, opt.status)}
                      >
                        {opt.label}
                      </ActionBtn>
                    ))
                  }
                </div>
                {updating && (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                    <span className="text-xs text-zinc-500">Atualizando...</span>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de cancelamento — ação definitiva */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="px-5 py-5">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Deseja realmente cancelar o agendamento deste cliente?
              </h3>
              <p className="text-sm text-zinc-400">
                <strong className="text-white">{confirmCancel.client.name}</strong> — {confirmCancel.service.name},{' '}
                {formatTime(confirmCancel.date)}
              </p>
              <p className="text-xs text-zinc-600 mt-3 leading-relaxed">
                Esta ação não pode ser desfeita: o cliente será avisado pelo WhatsApp
                e o agendamento não poderá ser reaberto.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setConfirmCancel(null)}
                disabled={updating}
                className="flex-1 py-2.5 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-medium hover:border-zinc-600 transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  await changeStatus(confirmCancel.id, 'CANCELLED')
                  setConfirmCancel(null)
                }}
                disabled={updating}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {updating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
                  : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-500 flex-shrink-0">{icon}</span>
      <span className="text-xs text-zinc-500 w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  )
}

const colorMap = {
  green:  'bg-green-600 hover:bg-green-700 text-white',
  blue:   'bg-blue-600 hover:bg-blue-700 text-white',
  orange: 'bg-brand-500 hover:bg-brand-600 text-white',
  red:    'bg-red-600 hover:bg-red-700 text-white',
  zinc:   'bg-zinc-700 hover:bg-zinc-600 text-white',
}

function ActionBtn({ color, onClick, disabled, children }: {
  color: keyof typeof colorMap
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${colorMap[color]}`}
    >
      {children}
    </button>
  )
}
