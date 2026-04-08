import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, Save, Loader2, ChevronDown } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

// dayOfWeek: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb
const DAYS = [
  { dow: 1, label: 'Segunda'  },
  { dow: 2, label: 'Terça'    },
  { dow: 3, label: 'Quarta'   },
  { dow: 4, label: 'Quinta'   },
  { dow: 5, label: 'Sexta'    },
  { dow: 6, label: 'Sábado'   },
  { dow: 0, label: 'Domingo'  },
]

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

interface Block {
  uid: number      // apenas para key do React
  start: string
  end: string
}

interface DayState {
  active: boolean
  blocks: Block[]
}

type ScheduleMap = Record<number, DayState>  // key = dayOfWeek

let _uid = 1

function defaultDay(): DayState {
  return { active: false, blocks: [] }
}

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

export function ScheduleSettingsPage() {
  const token = useAuthStore(s => s.accessToken)

  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedProId, setSelectedProId] = useState<string>('')
  const [schedule, setSchedule]           = useState<ScheduleMap>({})
  const [loadingPros, setLoadingPros]     = useState(true)
  const [loadingSched, setLoadingSched]   = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')

  // Carrega profissionais ativos
  useEffect(() => {
    api.get<Professional[]>('/api/professionals', token ?? undefined)
      .then(data => {
        const actives = data.filter(p => p.active)
        setProfessionals(actives)
        if (actives.length > 0) setSelectedProId(actives[0].id)
      })
      .catch(() => setError('Erro ao carregar profissionais'))
      .finally(() => setLoadingPros(false))
  }, [token])

  // Carrega horários quando muda o profissional selecionado
  useEffect(() => {
    if (!selectedProId) return
    setLoadingSched(true)
    setError('')
    api.get<DbSchedule[]>(`/api/schedules?professionalId=${selectedProId}`, token ?? undefined)
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
      [dow]: {
        ...prev[dow],
        blocks: [...(prev[dow]?.blocks ?? []), { uid: _uid++, start: '09:00', end: '18:00' }],
      },
    }))
  }

  function removeBlock(dow: number, uid: number) {
    setSchedule(prev => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        blocks: prev[dow].blocks.filter(b => b.uid !== uid),
      },
    }))
  }

  function updateBlock(dow: number, uid: number, field: 'start' | 'end', value: string) {
    setSchedule(prev => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        blocks: prev[dow].blocks.map(b => b.uid === uid ? { ...b, [field]: value } : b),
      },
    }))
  }

  async function handleSave() {
    if (!selectedProId) return
    setSaving(true)
    setError('')
    try {
      await api.post('/api/schedules', mapToPayload(selectedProId, schedule), token ?? undefined)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const activeDays = DAYS.filter(d => schedule[d.dow]?.active).length

  if (loadingPros) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (professionals.length === 0) {
    return (
      <div className="text-center py-20">
        <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Nenhum profissional ativo encontrado.</p>
        <p className="text-zinc-600 text-xs mt-1">Cadastre um profissional antes de configurar os horários.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Horários de atendimento</h1>
          <p className="text-sm text-zinc-500">{activeDays} dia{activeDays !== 1 ? 's' : ''} configurado{activeDays !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loadingSched || !selectedProId}
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors pr-8"
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 flex items-start gap-2">
        <Clock className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <p>
          Configure os dias e horários de atendimento. Você pode adicionar mais de um bloco por dia
          para indicar intervalos — por exemplo, pausa no almoço.
        </p>
      </div>

      {/* Lista de dias */}
      {loadingSched ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(({ dow, label }) => {
            const day = schedule[dow] ?? defaultDay()
            return (
              <div
                key={dow}
                className={`bg-zinc-900 border rounded-xl transition-colors ${
                  day.active ? 'border-zinc-800' : 'border-zinc-800/50'
                }`}
              >
                {/* Linha do dia */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleDay(dow)}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                      day.active ? 'bg-brand-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      day.active ? 'left-5' : 'left-1'
                    }`} />
                  </button>

                  <span className={`text-sm font-semibold w-20 flex-shrink-0 ${day.active ? 'text-white' : 'text-zinc-600'}`}>
                    {label}
                  </span>

                  {!day.active && (
                    <span className="text-xs text-zinc-600 italic">Folga</span>
                  )}

                  {day.active && day.blocks.length === 0 && (
                    <span className="text-xs text-orange-400">Nenhum horário adicionado</span>
                  )}

                  {day.active && day.blocks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {day.blocks.map(b => (
                        <span key={b.uid} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">
                          {b.start} – {b.end}
                        </span>
                      ))}
                    </div>
                  )}

                  {day.active && (
                    <button
                      onClick={() => addBlock(dow)}
                      className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-400 transition-colors flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Intervalo
                    </button>
                  )}
                </div>

                {/* Blocos de horário */}
                {day.active && day.blocks.length > 0 && (
                  <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
                    {day.blocks.map((block, i) => (
                      <div key={block.uid} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600 w-16 flex-shrink-0">
                          {i === 0 ? 'Abertura' : `Bloco ${i + 1}`}
                        </span>

                        <input
                          type="time"
                          value={block.start}
                          onChange={e => updateBlock(dow, block.uid, 'start', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                        />

                        <span className="text-zinc-600 text-xs">até</span>

                        <input
                          type="time"
                          value={block.end}
                          onChange={e => updateBlock(dow, block.uid, 'end', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                        />

                        {day.blocks.length > 1 && (
                          <button
                            onClick={() => removeBlock(dow, block.uid)}
                            className="ml-auto text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                          >
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
