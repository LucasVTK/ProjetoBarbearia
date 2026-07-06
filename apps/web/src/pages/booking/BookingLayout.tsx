import { Scissors } from 'lucide-react'

interface Props {
  step: number       // 1, 2, 3
  title: string
  subtitle?: string
  barbershopName?: string
  children: React.ReactNode
}

const steps = ['Serviço', 'Horário', 'Confirmar']

export function BookingLayout({ step, title, subtitle, barbershopName, children }: Props) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col max-w-lg mx-auto">

      {/* Header fixo */}
      <header className="px-5 pt-6 pb-4 flex-shrink-0">
        {/* Logo da barbearia */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">{barbershopName ?? 'Agendamento'}</p>
            <p className="text-xs text-zinc-500">Agendamento online</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="flex items-center gap-2 mb-5">
          {steps.map((s, i) => {
            const num = i + 1
            const isDone    = num < step
            const isCurrent = num === step
            return (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    isDone    ? 'bg-brand-500 text-white' :
                    isCurrent ? 'bg-brand-500/20 border border-brand-500 text-brand-400' :
                                'bg-zinc-800 text-zinc-600'
                  }`}>
                    {isDone ? '✓' : num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${isCurrent ? 'text-white' : 'text-zinc-600'}`}>
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px ${num < step ? 'bg-brand-500' : 'bg-zinc-800'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Título da etapa */}
        <div>
          <h1 className="text-lg font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 px-5 pb-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
