import { useState, useEffect } from 'react'
import { Plus, Pencil, Phone, ToggleLeft, ToggleRight, Loader2, UserCheck, UserX } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

interface Professional {
  id: string
  name: string
  phone: string | null
  active: boolean
  createdAt: string
  _count: { appointments: number }
}

const emptyForm = { name: '', phone: '' }

export function ProfessionalsPage() {
  const token = useAuthStore(s => s.accessToken)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Professional | null>(null)
  const [form, setForm]         = useState(emptyForm)

  async function load() {
    try {
      const data = await api.get<Professional[]>('/api/professionals', token ?? undefined)
      setProfessionals(data)
    } catch {
      setError('Erro ao carregar profissionais')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
    setError('')
  }

  function openEdit(p: Professional) {
    setEditing(p)
    setForm({ name: p.name, phone: p.phone ?? '' })
    setModalOpen(true)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() || undefined }
      if (editing) {
        const updated = await api.put<Professional>(`/api/professionals/${editing.id}`, body, token ?? undefined)
        setProfessionals(prev => prev.map(p => p.id === editing.id ? { ...p, ...updated } : p))
      } else {
        const created = await api.post<Professional>('/api/professionals', body, token ?? undefined)
        setProfessionals(prev => [...prev, created])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(professional: Professional) {
    setError('')
    try {
      const updated = await api.patch<Professional>(
        `/api/professionals/${professional.id}/toggle`,
        {},
        token ?? undefined
      )
      setProfessionals(prev => prev.map(p => p.id === professional.id ? { ...p, active: updated.active } : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    }
  }

  const active   = professionals.filter(p => p.active)
  const inactive = professionals.filter(p => !p.active)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Profissionais</h1>
          <p className="text-sm text-zinc-500">{active.length} ativo{active.length !== 1 ? 's' : ''} · {inactive.length} inativo{inactive.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo profissional
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {professionals.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm mb-3">Nenhum profissional cadastrado ainda</p>
          <button onClick={openCreate} className="text-brand-500 text-sm hover:text-brand-400 transition-colors">
            Adicionar primeiro profissional
          </button>
        </div>
      )}

      <div className="space-y-2">
        {professionals.map(professional => (
          <div key={professional.id}
            className={`bg-zinc-900 border rounded-xl px-5 py-4 flex items-center gap-4 transition-colors ${
              professional.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
            }`}>

            {/* Avatar inicial */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
              professional.active ? 'bg-brand-500/20 text-brand-400' : 'bg-zinc-800 text-zinc-600'
            }`}>
              {professional.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{professional.name}</p>
              {professional.phone ? (
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {professional.phone}
                </p>
              ) : (
                <p className="text-xs text-zinc-600 mt-0.5">Sem telefone</p>
              )}
            </div>

            <div className="hidden sm:block text-right flex-shrink-0">
              <p className="text-xs text-zinc-500">{professional._count.appointments} atendimento{professional._count.appointments !== 1 ? 's' : ''}</p>
              {!professional.active && (
                <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-0.5">
                  <UserX className="w-3 h-3" /> Inativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => handleToggle(professional)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                title={professional.active ? 'Desativar' : 'Ativar'}>
                {professional.active
                  ? <ToggleRight className="w-5 h-5 text-brand-500" />
                  : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
              </button>
              <button onClick={() => openEdit(professional)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-white">
                {editing ? 'Editar profissional' : 'Novo profissional'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Telefone (opcional)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-600 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleSave}
                  disabled={!form.name.trim() || saving}
                  className="flex-1 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editing ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
