import { useState, useEffect } from 'react'
import { Save, Loader2, Store, Clock, Plus, Trash2, ChevronDown, Copy, Check } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

type Tab = 'barbershop' | 'schedule'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Barbershop {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  description: string | null
}

interface Professional {
  id: string
  name: string
  active: boolean
}

interface DbSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
}

interface Block { uid: number; start: string; end: string }
interface DayState { active: boolean; blocks: Block[] }
type ScheduleMap = Record<number, DayState>

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAYS = [
  { dow: 1, label: 'Segunda' },
  { dow: 2, label: 'Terça'   },
  { dow: 3, label: 'Quarta'  },
  { dow: 4, label: 'Quinta'  },
  { dow: 5, label: 'Sexta'   },
  { dow: 6, label: 'Sábado'  },
  { dow: 0, label: 'Domingo' },
]

let _uid = 1
function defaultDay(): DayState { return { active: false, blocks: [] } }

function mapToPayload(professionalId: string, map: ScheduleMap) {
  const schedules: { dayOfWeek: number; startTime: string; endTime: string; active: boolean }[] = []
  for (const d of DAYS) {
    const day = map[d.dow]
    if (!day?.active) continue
    for (const block of day.blocks) {
      schedules.push({ dayOfWeek: d.dow, startTime: block.start, endTime: block.end, active: true })
    }
  }
  return { professionalId, schedules }
}

// ─── Aba: Barbearia ───────────────────────────────────────────────────────────

function BarbershopTab({ token }: { token: string }) {
  const [form, setForm]     = useState({ name: '', phone: '', address: '', description: '' })
  const [slug, setSlug]     = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get<Barbershop>('/api/barbershop', token)
      .then(data => {
        setForm({
          name:        data.name        ?? '',
          phone:       data.phone       ?? '',
          address:     data.address     ?? '',
          description: data.description ?? '',
        })
        setSlug(data.slug)
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.put('/api/barbershop', {
        name:        form.name        || undefined,
        phone:       form.phone       || null,
        address:     form.address     || null,
        description: form.description || null,
      }, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/agendar/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Link de agendamento */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4">
        <p className="text-xs text-zinc-500 mb-1.5">Link de agendamento do cliente</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm text-brand-400 bg-zinc-800 px-3 py-2 rounded-lg truncate">
            {window.location.origin}/agendar/{slug}
          </code>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">Compartilhe este link com seus clientes para que possam agendar.</p>
      </div>

      {/* Formulário */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <Field label="Nome da barbearia *">
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Barbearia do João"
            className="input-field"
          />
        </Field>

        <Field label="Telefone / WhatsApp">
          <input
            type="text"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(11) 99999-9999"
            className="input-field"
          />
        </Field>

        <Field label="Endereço">
          <input
            type="text"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Rua Exemplo, 123 — Bairro, Cidade"
            className="input-field"
          />
        </Field>

        <Field label="Descrição (aparece para o cliente)">
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex: Especialistas em corte masculino moderno. Atendimento com hora marcada."
            rows={3}
            className="input-field resize-none"
          />
        </Field>

        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'
          }`}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : <><Save className="w-4 h-4" /> {saved ? 'Salvo!' : 'Salvar alterações'}</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Aba: Horários ────────────────────────────────────────────────────────────

function ScheduleTab({ token }: { token: string }) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedProId, setSelectedProId] = useState('')
  const [schedule, setSchedule]           = useState<ScheduleMap>({})
  const [loadingPros, setLoadingPros]     = useState(true)
  const [loadingSched, setLoadingSched]   = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')

  useEffect(() => {
    api.get<Professional[]>('/api/professionals', token)
      .then(data => {
        const actives = data.filter(p => p.active)
        setProfessionals(actives)
        if (actives.length > 0) setSelectedProId(actives[0].id)
      })
      .catch(() => setError('Erro ao carregar profissionais'))
      .finally(() => setLoadingPros(false))
  }, [token])

  useEffect(() => {
    if (!selectedProId) return
    setLoadingSched(true)
    setError('')
    api.get<DbSchedule[]>(`/api/schedules?professionalId=${selectedProId}`, token)
      .then(data => {
        const map: ScheduleMap = {}
        for (const d of DAYS) map[d.dow] = defaultDay()
        for (const s of data) {
          if (!map[s.dayOfWeek]) map[s.dayOfWeek] = defaultDay()
          map[s.dayOfWeek].active = true
          map[s.dayOfWeek].blocks.push({ uid: _uid++, start: s.startTime, end: s.endTime })
        }
        setSchedule(map)
      })
      .catch(() => setError('Erro ao carregar horários'))
      .finally(() => setLoadingSched(false))
  }, [selectedProId, token])

  function toggleDay(dow: number) {
    setSchedule(prev => {
      const day = prev[dow] ?? defaultDay()
      return {
        ...prev,
        [dow]: {
          active: !day.active,
          blocks: !day.active && day.blocks.length === 0
            ? [{ uid: _uid++, start: '09:00', end: '18:00' }]
            : day.blocks,
        },
      }
    })
  }

  function addBlock(dow: number) {
    setSchedule(prev => ({
      ...prev,
      [dow]: { ...prev[dow], blocks: [...(prev[dow]?.blocks ?? []), { uid: _uid++, start: '09:00', end: '18:00' }] },
    }))
  }

  function removeBlock(dow: number, uid: number) {
    setSchedule(prev => ({
      ...prev,
      [dow]: { ...prev[dow], blocks: prev[dow].blocks.filter(b => b.uid !== uid) },
    }))
  }

  function updateBlock(dow: number, uid: number, field: 'start' | 'end', value: string) {
    setSchedule(prev => ({
      ...prev,
      [dow]: { ...prev[dow], blocks: prev[dow].blocks.map(b => b.uid === uid ? { ...b, [field]: value } : b) },
    }))
  }

  async function handleSave() {
    if (!selectedProId) return
    setSaving(true)
    setError('')
    try {
      await api.post('/api/schedules', mapToPayload(selectedProId, schedule), token)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loadingPros) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
    </div>
  )

  if (professionals.length === 0) return (
    <div className="text-center py-16 text-zinc-500 text-sm">
      <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
      Não foi possível carregar seu perfil. Recarregue a página.
    </div>
  )

  const activeDays = DAYS.filter(d => schedule[d.dow]?.active).length

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Seletor de profissional */}
      {professionals.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <label className="block text-xs text-zinc-500 mb-1.5">Profissional</label>
          <div className="relative">
            <select
              value={selectedProId}
              onChange={e => setSelectedProId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-brand-500 pr-8"
            >
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Salvar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{activeDays} dia{activeDays !== 1 ? 's' : ''} configurado{activeDays !== 1 ? 's' : ''}</p>
        <button
          onClick={handleSave}
          disabled={saving || loadingSched}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'
          }`}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : <><Save className="w-4 h-4" /> {saved ? 'Salvo!' : 'Salvar'}</>
          }
        </button>
      </div>

      {/* Dias */}
      {loadingSched ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(({ dow, label }) => {
            const day = schedule[dow] ?? defaultDay()
            return (
              <div key={dow} className={`bg-zinc-900 border rounded-xl ${day.active ? 'border-zinc-800' : 'border-zinc-800/50'}`}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <button
                    onClick={() => toggleDay(dow)}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${day.active ? 'bg-brand-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${day.active ? 'left-5' : 'left-1'}`} />
                  </button>

                  <span className={`text-sm font-semibold w-20 flex-shrink-0 ${day.active ? 'text-white' : 'text-zinc-600'}`}>{label}</span>

                  {!day.active && <span className="text-xs text-zinc-600 italic">Folga</span>}
                  {day.active && day.blocks.length === 0 && <span className="text-xs text-orange-400">Nenhum horário</span>}
                  {day.active && day.blocks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {day.blocks.map(b => (
                        <span key={b.uid} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">{b.start} – {b.end}</span>
                      ))}
                    </div>
                  )}

                  {day.active && (
                    <button onClick={() => addBlock(dow)} className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-400 transition-colors flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Intervalo
                    </button>
                  )}
                </div>

                {day.active && day.blocks.length > 0 && (
                  <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
                    {day.blocks.map((block, i) => (
                      <div key={block.uid} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600 w-16 flex-shrink-0">{i === 0 ? 'Abertura' : `Bloco ${i + 1}`}</span>
                        <input type="time" value={block.start} onChange={e => updateBlock(dow, block.uid, 'start', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500" />
                        <span className="text-zinc-600 text-xs">até</span>
                        <input type="time" value={block.end} onChange={e => updateBlock(dow, block.uid, 'end', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500" />
                        {day.blocks.length > 1 && (
                          <button onClick={() => removeBlock(dow, block.uid)} className="ml-auto text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function SettingsPage() {
  const token = useAuthStore(s => s.accessToken) ?? ''
  const [tab, setTab] = useState<Tab>('barbershop')

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Configurações</h1>

      {/* Abas */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        <TabBtn active={tab === 'barbershop'} onClick={() => setTab('barbershop')} icon={<Store className="w-4 h-4" />}>
          Minha barbearia
        </TabBtn>
        <TabBtn active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={<Clock className="w-4 h-4" />}>
          Horários
        </TabBtn>
      </div>

      {tab === 'barbershop' ? <BarbershopTab token={token} /> : <ScheduleTab token={token} />}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void
  icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon}{children}
    </button>
  )
}
