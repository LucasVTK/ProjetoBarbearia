import { useState, useEffect, useCallback } from 'react'
import { Search, Phone, Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, FileText, Pencil, Check, X } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

type AppStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'NO_SHOW'

interface ClientAppointment {
  id: string
  date: string
  status: AppStatus
  price: string
  service: string
  professional: string
}

interface Client {
  id: string
  name: string
  phone: string
  notes: string | null
  noShowCount: number
  totalVisits: number
  totalSpent: number
  lastVisit: string | null
  createdAt: string
}

interface ClientDetail extends Client {
  appointments: ClientAppointment[]
}

const statusCfg: Partial<Record<AppStatus, { icon: typeof CheckCircle; color: string; label: string }>> = {
  DONE:      { icon: CheckCircle, color: 'text-green-400',  label: 'Concluído' },
  CANCELLED: { icon: XCircle,     color: 'text-red-400',    label: 'Cancelado' },
  NO_SHOW:   { icon: AlertCircle, color: 'text-orange-400', label: 'Não veio'  },
  PENDING:   { icon: Clock,       color: 'text-zinc-400',   label: 'Pendente'  },
  CONFIRMED: { icon: Clock,       color: 'text-blue-400',   label: 'Confirmado'},
  IN_PROGRESS: { icon: Clock,     color: 'text-brand-400',  label: 'Em atend.' },
}

const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-600', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function ClientsPage() {
  const token = useAuthStore(s => s.accessToken)
  const [clients, setClients]       = useState<Client[]>([])
  const [selected, setSelected]     = useState<ClientDetail | null>(null)
  const [loading, setLoading]       = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [search, setSearch]         = useState('')
  const [error, setError]           = useState('')
  const [notes, setNotes]           = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [savingName, setSavingName]   = useState(false)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    setError('')
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await api.get<Client[]>(`/api/clients${qs}`, token ?? undefined)
      setClients(data)
    } catch {
      setError('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  // Debounce na busca
  useEffect(() => {
    const t = setTimeout(() => load(search), 350)
    return () => clearTimeout(t)
  }, [search, load])

  async function openDetail(client: Client) {
    setLoadingDetail(true)
    setSelected(null)
    try {
      const data = await api.get<ClientDetail>(`/api/clients/${client.id}`, token ?? undefined)
      setSelected(data)
      setNotes(data.notes ?? '')
      setNameInput(data.name)
      setEditingName(false)
    } catch {
      setError('Erro ao carregar detalhes')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleSaveNotes() {
    if (!selected) return
    setSavingNotes(true)
    try {
      await api.patch(`/api/clients/${selected.id}`, { notes }, token ?? undefined)
      setSelected(prev => prev ? { ...prev, notes } : prev)
      setClients(prev => prev.map(c => c.id === selected.id ? { ...c, notes } : c))
    } catch {
      setError('Erro ao salvar anotações')
    } finally {
      setSavingNotes(false)
    }
  }

  // Correção de nome — só o barbeiro pode (o agendamento público não altera
  // mais o nome de telefone já cadastrado)
  async function handleSaveName() {
    if (!selected) return
    const name = nameInput.trim()
    if (name.length < 2 || name === selected.name) {
      setEditingName(false)
      setNameInput(selected.name)
      return
    }
    setSavingName(true)
    try {
      await api.patch(`/api/clients/${selected.id}`, { name }, token ?? undefined)
      setSelected(prev => prev ? { ...prev, name } : prev)
      setClients(prev => prev.map(c => c.id === selected.id ? { ...c, name } : c))
      setEditingName(false)
    } catch {
      setError('Erro ao salvar nome')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-500">{clients.length} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => openDetail(client)}
              className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3.5 flex items-center gap-3 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(client.name)}`}>
                {getInitials(client.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{client.name}</p>
                  {client.noShowCount >= 2 && (
                    <span className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {client.noShowCount}× no-show
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />{client.phone}
                  </span>
                  {client.lastVisit && (
                    <>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />Última: {formatDate(client.lastVisit)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-zinc-100">{client.totalVisits}× visitas</p>
                <p className="text-xs text-zinc-500">
                  R$ {client.totalSpent.toFixed(2).replace('.', ',')} total
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Loading detail */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      )}

      {/* Modal detalhe */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <h3 className="text-base font-semibold text-zinc-100">Perfil do cliente</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-100 transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto">
              {/* Info principal */}
              <div className="px-5 py-4 flex items-center gap-3 border-b border-zinc-800">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0 ${getAvatarColor(selected.name)}`}>
                  {getInitials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNameInput(selected.name) } }}
                        autoFocus
                        className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={savingName || nameInput.trim().length < 2}
                        className="p-1.5 text-green-400 hover:text-green-300 disabled:opacity-40 transition-colors flex-shrink-0"
                        title="Salvar nome"
                      >
                        {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameInput(selected.name) }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-zinc-100 truncate">{selected.name}</p>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-zinc-600 hover:text-brand-400 transition-colors flex-shrink-0"
                        title="Corrigir nome"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-zinc-500">{selected.phone}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Cliente desde {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800">
                <Stat icon={<Calendar className="w-3.5 h-3.5" />}    label="Visitas"     value={String(selected.totalVisits)} />
                <Stat icon={<TrendingUp className="w-3.5 h-3.5" />}  label="Total gasto" value={`R$\u00a0${selected.totalSpent.toFixed(0)}`} />
                <Stat icon={<AlertCircle className="w-3.5 h-3.5" />} label="No-shows"    value={String(selected.noShowCount)} warn={selected.noShowCount >= 2} />
              </div>

              {/* Anotações */}
              <div className="px-5 py-4 border-b border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Anotações do barbeiro
                </p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: prefere máquina 2, alérgico a produto X..."
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === (selected.notes ?? '')}
                  className="mt-2 text-xs text-brand-500 hover:text-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savingNotes ? 'Salvando...' : 'Salvar anotação'}
                </button>
              </div>

              {/* Histórico */}
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Últimos atendimentos
                </p>
                {selected.appointments.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">Nenhum atendimento registrado</p>
                ) : (
                  <div className="space-y-2">
                    {selected.appointments.map(apt => {
                      const cfg = statusCfg[apt.status]
                      const Icon = cfg?.icon ?? Clock
                      return (
                        <div key={apt.id} className="flex items-center gap-3 py-2 border-b border-zinc-800/50 last:border-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg?.color ?? 'text-zinc-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-100">{apt.service}</p>
                            <p className="text-xs text-zinc-500">{formatDate(apt.date)} · {apt.professional}</p>
                          </div>
                          <span className="text-sm font-medium text-zinc-300 flex-shrink-0">
                            R$ {parseFloat(String(apt.price)).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center py-3 gap-1">
      <span className={warn ? 'text-orange-400' : 'text-zinc-500'}>{icon}</span>
      <p className={`text-sm font-bold ${warn ? 'text-orange-400' : 'text-zinc-100'}`}>{value}</p>
      <p className="text-xs text-zinc-600">{label}</p>
    </div>
  )
}
