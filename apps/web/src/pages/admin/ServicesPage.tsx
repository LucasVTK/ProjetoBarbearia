import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Clock, DollarSign, Tag, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

type ServiceType = 'SERVICE' | 'COMBO'

interface Service {
  id: string
  name: string
  description: string | null
  price: string   // Prisma retorna Decimal como string
  duration: number
  type: ServiceType
  active: boolean
}

const emptyForm = { name: '', description: '', price: 0, duration: 30, type: 'SERVICE' as ServiceType }

export function ServicesPage() {
  const token = useAuthStore(s => s.accessToken)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function load() {
    try {
      const data = await api.get<Service[]>('/api/services', token ?? undefined)
      setServices(data)
    } catch {
      setError('Erro ao carregar serviços')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      price: parseFloat(s.price),
      duration: s.duration,
      type: s.type,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || form.price <= 0) return
    setSaving(true)
    try {
      if (editing) {
        const updated = await api.put<Service>(`/api/services/${editing.id}`, form, token ?? undefined)
        setServices(prev => prev.map(s => s.id === editing.id ? updated : s))
      } else {
        const created = await api.post<Service>('/api/services', form, token ?? undefined)
        setServices(prev => [...prev, created])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/services/${id}`, token ?? undefined)
      setServices(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
    setDeleteConfirm(null)
  }

  async function toggleActive(service: Service) {
    try {
      const updated = await api.put<Service>(
        `/api/services/${service.id}`,
        { active: !service.active },
        token ?? undefined
      )
      setServices(prev => prev.map(s => s.id === service.id ? updated : s))
    } catch {
      setError('Erro ao atualizar serviço')
    }
  }

  const active   = services.filter(s => s.active)
  const inactive = services.filter(s => !s.active)

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
          <h1 className="text-xl font-bold text-white">Serviços</h1>
          <p className="text-sm text-zinc-500">{active.length} ativos · {inactive.length} inativos</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo serviço
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {services.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">Nenhum serviço cadastrado ainda</p>
          <button onClick={openCreate} className="mt-3 text-brand-500 text-sm hover:text-brand-400 transition-colors">
            Criar primeiro serviço
          </button>
        </div>
      )}

      <div className="space-y-2">
        {services.map(service => (
          <div key={service.id}
            className={`bg-zinc-900 border rounded-xl px-5 py-4 flex items-center gap-4 transition-colors ${
              service.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
            }`}>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              service.type === 'COMBO' ? 'bg-purple-500/10 text-purple-400' : 'bg-brand-500/10 text-brand-400'
            }`}>
              {service.type === 'COMBO' ? 'Combo' : 'Serviço'}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{service.name}</p>
              {service.description && (
                <p className="text-xs text-zinc-500 truncate mt-0.5">{service.description}</p>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />{service.duration} min
            </div>

            <div className="flex items-center gap-1 text-sm font-bold text-white flex-shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
              {parseFloat(service.price).toFixed(2).replace('.', ',')}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => toggleActive(service)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                title={service.active ? 'Desativar' : 'Ativar'}>
                {service.active
                  ? <ToggleRight className="w-4 h-4 text-brand-500" />
                  : <ToggleLeft className="w-4 h-4 text-zinc-600" />}
              </button>
              <button onClick={() => openEdit(service)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setDeleteConfirm(service.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <Modal title={editing ? 'Editar serviço' : 'Novo serviço'} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo</label>
              <div className="flex gap-2">
                {(['SERVICE', 'COMBO'] as ServiceType[]).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.type === t
                        ? 'bg-brand-500/10 border-brand-500 text-brand-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}>
                    <Tag className="w-3.5 h-3.5" />
                    {t === 'SERVICE' ? 'Serviço' : 'Combo'}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Nome do serviço">
              <input type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte + Barba" className="input" />
            </Field>

            <Field label="Descrição (opcional)">
              <input type="text" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Corte completo com acabamento na navalha" className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)">
                <input type="number" min={0} step={0.01} value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00" className="input" />
              </Field>
              <Field label="Duração (min)">
                <input type="number" min={5} step={5} value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 0 }))}
                  placeholder="30" className="input" />
              </Field>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-600 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleSave}
                disabled={!form.name.trim() || form.price <= 0 || saving}
                className="flex-1 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editing ? 'Salvar' : 'Criar serviço')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal excluir */}
      {deleteConfirm && (
        <Modal title="Excluir serviço?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-zinc-400 mb-5">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-600 transition-colors">
              Cancelar
            </button>
            <button onClick={() => handleDelete(deleteConfirm)}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
