import 'dotenv/config'

// Fail-fast: sem essas variáveis a API não pode operar com segurança
const required = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'] as const

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`❌ Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`)
  process.exit(1)
}
