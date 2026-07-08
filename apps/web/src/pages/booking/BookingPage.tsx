import { useState, useEffect } from 'react'
import { Clock, DollarSign, ChevronRight, ChevronLeft, Calendar, User, Phone, CheckCircle, Tag, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { BookingLayout } from './BookingLayout'
import { api } from '../../services/api'

type ServiceType = 'SERVICE' | 'COMBO'

interface Service {
  id: string
  name: string
  description: string | null
  price: string
  duration: number
  type: ServiceType
}

function getNextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDay(d: Date) {
  if (d.toDateString() === new Date().toDateString()) return 'Hoje'
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
}

export function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep]               = useState(1)
  const [selectedService, setService] = useState<Service | null>(null)
  const [selectedDate, setDate]       = useState<Date>(new Date())
  const [selectedTime, setTime]       = useState<string | null>(null)
  const [professionalId, setProfId]   = useState<string | null>(null)
  const [form, setForm]               = useState({ name: '', phone: '' })
  const [cancelToken, setCancelToken] = useState('')
  const [copied, setCopied]           = useState(false)
  const [done, setDone]               = useState(false)

  const [barbershopName, setBarbershopName] = useState<string>()
  const [services, setServices]             = useState<Service[]>([])
  const [slots, setSlots]                   = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingSlots, setLoadingSlots]       = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [error, setError]                     = useState('')

  const days = getNextDays(14) // 2 semanas de antecedência

  // Carrega dados da barbearia e serviços
  useEffect(() => {
    if (!slug) return
    api.get<{ name: string }>(`/api/barbershop/public/${slug}`)
      .then(data => setBarbershopName(data.name))
      .catch(() => {})
    api.get<Service[]>(`/api/services/public/${slug}`)
      .then(setServices)
      .catch(() => setError('Erro ao carregar serviços'))
      .finally(() => setLoadingServices(false))
  }, [slug])

  // Carrega slots disponíveis quando muda data ou serviço
  useEffect(() => {
    if (!selectedService || !slug) return
    setLoadingSlots(true)
    setTime(null)

    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    api.get<{ slots: string[]; professionalId: string }>(
      `/api/schedules/slots/${slug}?date=${dateStr}&serviceId=${selectedService.id}`
    )
      .then(data => {
        setSlots(data.slots)
        setProfId(data.professionalId)
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedService, selectedDate, slug])

  async function handleConfirm() {
    if (!form.name.trim() || form.phone.length < 10 || !selectedService || !selectedTime || !professionalId) return
    setSubmitting(true)
    setError('')

    try {
      const [h, m] = selectedTime.split(':').map(Number)
      const date = new Date(selectedDate)
      date.setHours(h, m, 0, 0)

      const result = await api.post<{ cancelToken: string }>(
        `/api/appointments/book/${slug}`,
        {
          serviceId:      selectedService.id,
          professionalId,
          date:           date.toISOString(),
          clientName:     form.name,
          clientPhone:    form.phone.replace(/\D/g, ''),
        }
      )
      setCancelToken(result.cancelToken)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar. Tente outro horário.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopy(link: string) {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    setStep(1); setService(null); setDate(new Date())
    setTime(null); setForm({ name: '', phone: '' })
    setCancelToken(''); setDone(false); setError('')
  }

  // --- Tela de sucesso ---
  if (done) {
    const cancelLink = `${window.location.origin}/cancelar/${cancelToken}`
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-1">Agendado com sucesso!</h2>
            <p className="text-zinc-400 text-sm">Enviaremos um lembrete pelo WhatsApp antes do atendimento.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-3 mb-4">
            <SummaryRow icon={<User className="w-4 h-4" />}       label={form.name} />
            <SummaryRow icon={<Tag className="w-4 h-4" />}        label={selectedService!.name} />
            <SummaryRow icon={<Calendar className="w-4 h-4" />}   label={`${formatDay(selectedDate)}, ${selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`} />
            <SummaryRow icon={<Clock className="w-4 h-4" />}      label={selectedTime!} />
            <SummaryRow icon={<DollarSign className="w-4 h-4" />} label={`R$ ${parseFloat(selectedService!.price).toFixed(2).replace('.', ',')}`} />
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-zinc-100">Guarde seu link de cancelamento</p>
            </div>
            <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
              Cancelamentos devem ser feitos com no mínimo{' '}
              <strong className="text-orange-400">2 horas de antecedência</strong>.
              Após esse prazo o valor poderá ser cobrado.
            </p>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
              <span className="text-xs text-zinc-400 flex-1 truncate">{cancelLink}</span>
              <button onClick={() => handleCopy(cancelLink)}
                className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 transition-colors ${
                  copied ? 'text-green-400' : 'text-brand-400 hover:text-brand-300'
                }`}>
                {copied
                  ? <><Check className="w-3.5 h-3.5" /> Copiado!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
            </div>
          </div>

          <button onClick={handleReset}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm transition-colors">
            Fazer outro agendamento
          </button>
        </div>
      </div>
    )
  }

  // --- Step 1: Serviço ---
  if (step === 1) {
    return (
      <BookingLayout step={1} barbershopName={barbershopName} title="Escolha o serviço" subtitle="Selecione o que deseja fazer">
        {loadingServices ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <div className="space-y-2 mt-2">
            {services.map(s => (
              <button key={s.id} onClick={() => { setService(s); setStep(2) }}
                className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  s.type === 'COMBO' ? 'bg-purple-500/10 text-purple-400' : 'bg-brand-500/10 text-brand-400'
                }`}>
                  {s.type === 'COMBO' ? 'Combo' : 'Serviço'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">{s.name}</p>
                  {s.description && <p className="text-xs text-zinc-500">{s.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-zinc-100">R$ {parseFloat(s.price).toFixed(0)}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-0.5 justify-end">
                    <Clock className="w-3 h-3" />{s.duration}min
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </BookingLayout>
    )
  }

  // --- Step 2: Horário ---
  if (step === 2) {
    return (
      <BookingLayout step={2} barbershopName={barbershopName} title="Escolha o horário" subtitle={selectedService?.name}>
        <div className="space-y-5 mt-2">

          {/* Seletor de dias — scroll horizontal, 14 dias */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Selecione o dia</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
              {days.map((d, i) => {
                const isSelected = d.toDateString() === selectedDate.toDateString()
                return (
                  <button key={i} onClick={() => setDate(d)}
                    className={`flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}>
                    <span className="text-xs opacity-80">{formatDay(d)}</span>
                    <span className="text-base font-bold">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slots disponíveis */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Horários disponíveis</p>
            {loadingSlots ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Nenhum horário disponível neste dia
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button key={slot} onClick={() => setTime(slot)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedTime === slot
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-600'
                    }`}>
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resumo serviço */}
          {selectedService && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500">Serviço selecionado</p>
                <p className="text-sm font-semibold text-zinc-100">{selectedService.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-100">R$ {parseFloat(selectedService.price).toFixed(0)}</p>
                <p className="text-xs text-zinc-500">{selectedService.duration} min</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-3 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-medium hover:border-zinc-600 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <button disabled={!selectedTime} onClick={() => setStep(3)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors">
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </BookingLayout>
    )
  }

  // --- Step 3: Confirmação ---
  return (
    <BookingLayout step={3} barbershopName={barbershopName} title="Confirmar agendamento" subtitle="Só mais um passo">
      <div className="space-y-5 mt-2">

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Serviço</span>
            <span className="text-sm font-semibold text-zinc-100">{selectedService?.name}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Data</span>
            <span className="text-sm text-zinc-100 capitalize">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Horário</span>
            <span className="text-sm text-zinc-100">{selectedTime}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Valor</span>
            <span className="text-sm font-bold text-zinc-100">
              R$ {parseFloat(selectedService?.price ?? '0').toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Seus dados</p>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Seu nome" className="input pl-9" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-9999" className="input pl-9" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Você receberá um lembrete pelo WhatsApp antes do horário
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={() => setStep(2)}
            className="flex items-center gap-1.5 px-4 py-3 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-medium hover:border-zinc-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <button
            disabled={!form.name.trim() || form.phone.length < 10 || submitting}
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</>
              : <><CheckCircle className="w-4 h-4" /> Confirmar agendamento</>}
          </button>
        </div>
      </div>
    </BookingLayout>
  )
}

function SummaryRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="text-zinc-500 flex-shrink-0">{icon}</span>
      <span className="text-zinc-300">{label}</span>
    </div>
  )
}
