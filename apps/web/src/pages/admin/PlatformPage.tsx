import { useState, useEffect, useCallback } from 'react'
import { Shield, Search, Loader2, Eye, XCircle, RotateCcw } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

// ─── Tipos (espelham as respostas de /api/admin) ──────────────────────────────

interface Overview {
  total: number
  active: number
  suspended: number
  new30d: number
  appointments30d: number
  inactive14d: number
}

interface Shop {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  owner: { name: string; email: string; phone: string | null }
  isPlatformOwner: boolean
  appointments30d: number
  totalClients: number
  lastAppointmentAt: string | null
}

interface ShopDetail {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  owner: { name: string; email: string; phone: string | null }
  isPlatformOwner: boolean
  _count: { services: number; clients: number; appointments: number }
}

interface AuditLog {
  id: string
  adminName: string
  action: 'SUSPEND' | 'REACTIVATE' | 'VIEW' | 'DENIED'
  detail: string | null
  ip: string | null
  createdAt: string
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'inactive'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

const NEW_DAYS = 7 * 24 * 60 * 60 * 1000

type ChipKind = 'active' | 'suspended' | 'inactive' | 'new'

function shopChip(s: Shop): { kind: ChipKind; label: string; cls: string } {
  if (!s.active) return { kind: 'suspended', label: 'Suspensa', cls: 'bg-red-500/10 text-red-400' }
  if (Date.now() - new Date(s.createdAt).getTime() < NEW_DAYS)
    return { kind: 'new', label: 'Nova (7d)', cls: 'bg-blue-500/10 text-blue-400' }
  if (s.appointments30d === 0)
    return { kind: 'inactive', label: 'Sem atividade', cls: 'bg-orange-500/10 text-orange-400' }
  return { kind: 'active', label: 'Ativa', cls: 'bg-green-500/10 text-green-400' }
}

const auditConfig: Record<AuditLog['action'], { label: string; dot: string }> = {
  SUSPEND:    { label: 'Suspendeu',        dot: 'bg-red-400' },
  REACTIVATE: { label: 'Reativou',         dot: 'bg-green-400' },
  VIEW:       { label: 'Visualizou',       dot: 'bg-blue-400' },
  DENIED:     { label: 'Tentativa negada', dot: 'bg-orange-400' },
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PlatformPage() {
  const { accessToken } = useAuthStore()
  const token = accessToken ?? undefined

  const [overview, setOverview]   = useState<Overview | null>(null)
  const [shops, setShops]         = useState<Shop[]>([])
  const [audit, setAudit]         = useState<AuditLog[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState<StatusFilter>('all')

  const [detail, setDetail]           = useState<ShopDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<Shop | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [working, setWorking]             = useState(false)

  const fetchAll = useCallback(async () => {
    setError('')
    try {
      const [ov, list, logs] = await Promise.all([
        api.get<Overview>('/api/admin/overview', token),
        api.get<Shop[]>('/api/admin/barbershops', token),
        api.get<AuditLog[]>('/api/admin/audit', token),
      ])
      setOverview(ov)
      setShops(list)
      setAudit(logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a plataforma')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Busca e filtro no cliente — a base é pequena e evita requests por tecla
  const visible = shops.filter(s => {
    const chip = shopChip(s).kind
    if (status === 'active'    && !(chip === 'active' || chip === 'new')) return false
    if (status === 'suspended' && chip !== 'suspended') return false
    if (status === 'inactive'  && chip !== 'inactive') return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q)
        || s.owner.name.toLowerCase().includes(q)
        || s.owner.email.toLowerCase().includes(q)
    }
    return true
  })

  async function openDetail(id: string) {
    setLoadingDetail(true)
    try {
      setDetail(await api.get<ShopDetail>(`/api/admin/barbershops/${id}`, token))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleSuspend() {
    if (!suspendTarget) return
    setWorking(true)
    try {
      await api.patch(`/api/admin/barbershops/${suspendTarget.id}/suspend`,
        suspendReason ? { reason: suspendReason } : {}, token)
      setSuspendTarget(null)
      setSuspendReason('')
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao suspender')
      setSuspendTarget(null)
    } finally {
      setWorking(false)
    }
  }

  async function handleReactivate(id: string) {
    setWorking(true)
    try {
      await api.patch(`/api/admin/barbershops/${id}/reactivate`, {}, token)
      setDetail(null)
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reativar')
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Faixa de sessão auditada */}
      <div className="flex items-center gap-2.5 bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs px-4 py-2.5 rounded-xl">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span><strong className="font-semibold">Sessão de administrador da plataforma.</strong>{' '}
        Todas as ações desta área são registradas em auditoria.</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Plataforma</h1>
          <p className="text-sm text-zinc-500">Todas as barbearias que assinam o BarberPro</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Visão geral */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { k: overview.active,          l: 'Barbearias ativas',   d: `${overview.new30d} novas em 30d`,  cls: 'text-green-400' },
            { k: overview.appointments30d, l: 'Agendamentos (30d)',  d: 'toda a plataforma',                cls: 'text-zinc-500' },
            { k: overview.suspended,       l: 'Suspensas',           d: 'login e página bloqueados',        cls: 'text-red-400' },
            { k: overview.inactive14d,     l: 'Sem atividade 14d+',  d: 'risco de churn',                   cls: 'text-orange-400' },
          ].map(t => (
            <div key={t.l} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5">
              <p className="text-xl font-bold text-white tabular-nums">{t.k}</p>
              <p className="text-xs text-zinc-500">{t.l}</p>
              <p className={`text-[11px] mt-1 ${t.cls}`}>{t.d}</p>
            </div>
          ))}
        </div>
      )}

      {/* Busca + filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por barbearia, dono ou e-mail…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
          />
        </div>
        {([
          ['all', 'Todas'], ['active', 'Ativas'], ['suspended', 'Suspensas'], ['inactive', 'Sem atividade'],
        ] as [StatusFilter, string][]).map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              status === value
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
              <th className="px-4 py-3 font-semibold">Barbearia</th>
              <th className="px-4 py-3 font-semibold">Dono</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Atividade (30d)</th>
              <th className="px-4 py-3 font-semibold">Desde</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-600 text-sm">
                Nenhuma barbearia encontrada
              </td></tr>
            )}
            {visible.map(s => {
              const chip = shopChip(s)
              return (
                <tr key={s.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{s.name}{s.isPlatformOwner && <span className="ml-2 text-[10px] text-brand-400">(sua)</span>}</p>
                    <p className="text-[11px] text-zinc-600">/agendar/{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {s.owner.name}
                    <p className="text-[11px] text-zinc-600">{s.owner.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${chip.cls}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{chip.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">
                    {s.active ? `${s.appointments30d} agendamentos` : '— bloqueada'}
                    <p className="text-[11px] text-zinc-600">
                      {s.lastAppointmentAt ? `último: ${timeAgo(s.lastAppointmentAt)}` : 'sem agendamentos'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 tabular-nums">{formatMonth(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => openDetail(s.id)} disabled={loadingDetail}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </button>
                      {!s.isPlatformOwner && (s.active ? (
                        <button onClick={() => setSuspendTarget(s)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Suspender
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(s.id)} disabled={working}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50">
                          <RotateCcw className="w-3.5 h-3.5" /> Reativar
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-600 -mt-2">
        A suspensão bloqueia o login do barbeiro <strong>e</strong> a página pública de agendamento —
        nada é apagado; reativar restaura tudo.
      </p>

      {/* Auditoria */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Auditoria</h2>
        <p className="text-xs text-zinc-600 mb-4">Registro imutável de tudo que o administrador fez</p>
        {audit.length === 0 ? (
          <p className="text-sm text-zinc-600 py-4 text-center">Nenhuma ação registrada ainda</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {audit.map(log => {
              const cfg = auditConfig[log.action]
              return (
                <li key={log.id} className="flex items-start gap-2.5 py-2.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                  <span className="text-zinc-300">
                    <strong className="font-semibold">{cfg.label}</strong>
                    {log.detail ? ` — ${log.detail}` : ''}
                    <span className="text-zinc-600"> · {log.adminName}</span>
                  </span>
                  <span className="ml-auto text-zinc-600 whitespace-nowrap tabular-nums">
                    {timeAgo(log.createdAt)}{log.ip ? ` · ${log.ip}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Modal: detalhes */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-white">{detail.name}</h3>
              <button onClick={() => setDetail(null)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              {[
                ['Dono',         `${detail.owner.name} · ${detail.owner.email}${detail.owner.phone ? ` · ${detail.owner.phone}` : ''}`],
                ['Link público', `/agendar/${detail.slug}`],
                ['Cliente desde', new Date(detail.createdAt).toLocaleDateString('pt-BR')],
                ['Serviços',     `${detail._count.services} cadastrados`],
                ['Clientes',     `${detail._count.clients} na base`],
                ['Agendamentos', `${detail._count.appointments} no total`],
                ['Status',       detail.active ? 'Ativa' : 'Suspensa'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-xs text-zinc-500 w-24 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-zinc-300">{value}</span>
                </div>
              ))}
            </div>
            {!detail.isPlatformOwner && (
              <div className="flex gap-2 px-5 pb-5 pt-1">
                {detail.active ? (
                  <button onClick={() => { setSuspendTarget(shops.find(s => s.id === detail.id) ?? null); setDetail(null) }}
                    className="flex-1 py-2.5 border border-red-500/25 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors">
                    Suspender
                  </button>
                ) : (
                  <button onClick={() => handleReactivate(detail.id)} disabled={working}
                    className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                    Reativar conta
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: suspender */}
      {suspendTarget && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="px-5 py-5">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Suspender "{suspendTarget.name}"?</h3>
              <p className="text-sm text-zinc-400 mb-3">
                O dono perde o acesso na hora e a página de agendamento sai do ar.
                Nada é apagado — você pode reativar quando quiser.
              </p>
              <input
                type="text" value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                placeholder="Motivo (opcional — fica na auditoria)" maxLength={200}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => { setSuspendTarget(null); setSuspendReason('') }} disabled={working}
                className="flex-1 py-2.5 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-medium hover:border-zinc-600 transition-colors disabled:opacity-50">
                Voltar
              </button>
              <button onClick={handleSuspend} disabled={working}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {working ? <><Loader2 className="w-4 h-4 animate-spin" /> Suspendendo…</> : 'Sim, suspender'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
