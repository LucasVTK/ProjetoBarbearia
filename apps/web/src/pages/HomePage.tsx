import { Scissors, Calendar, TrendingUp, Star, ArrowRight, CheckCircle } from 'lucide-react'

export function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">BarberPro</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Entrar
          </a>
          <a
            href="/register"
            className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Começar grátis
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-6">
          <Star className="w-3.5 h-3.5 text-brand-500" />
          Sistema profissional para barbearias
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
          Chega de agenda pelo{' '}
          <span className="text-brand-500">WhatsApp</span>
        </h1>

        <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
          Agendamento online, lembretes automáticos e controle financeiro — tudo num só lugar.
          Seus clientes agendam sozinhos. Você foca no que sabe fazer.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold text-base transition-colors"
          >
            Quero usar grátis
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/demo"
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-6 py-3 rounded-xl font-medium text-base transition-colors"
          >
            Ver demonstração
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-12">
          Tudo que sua barbearia precisa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Calendar className="w-6 h-6 text-brand-500" />}
            title="Agendamento online"
            description="Seus clientes escolhem o serviço, o horário e o profissional direto pelo celular, sem precisar te chamar."
          />
          <FeatureCard
            icon={<CheckCircle className="w-6 h-6 text-brand-500" />}
            title="Confirmação automática"
            description="Lembretes automáticos reduzem faltas. Menos no-show, mais faturamento."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-brand-500" />}
            title="Controle financeiro"
            description="Veja quanto entrou no dia, na semana e no mês. Comissões calculadas automaticamente."
          />
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-white mb-3">
            Pronto para profissionalizar sua barbearia?
          </h3>
          <p className="text-zinc-400 mb-6">
            Configure em menos de 5 minutos e comece a receber agendamentos hoje.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Criar minha conta grátis
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-zinc-800 text-center text-sm text-zinc-600">
        © {new Date().getFullYear()} BarberPro. Todos os direitos reservados.
          <br/><span>Criado por  <a href="https://www.linkedin.com/in/lucasnogueiraandrade/">Lucas Nogueira Andrade</a></span>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
