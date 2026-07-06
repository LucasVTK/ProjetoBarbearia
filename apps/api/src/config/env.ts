import 'dotenv/config'

// Fuso horário do negócio. A lógica de agenda/slots usa a hora local do
// processo — em servidores cloud (Railway etc.) o padrão é UTC, o que
// deslocaria todos os horários em 3h. Este arquivo é o primeiro import
// da aplicação, então o TZ vale para todas as datas.
process.env.TZ = process.env.TZ ?? 'America/Sao_Paulo'

// Fail-fast: sem essas variáveis a API não pode operar com segurança
const required = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'] as const

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`❌ Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`)
  process.exit(1)
}
