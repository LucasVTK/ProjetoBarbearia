// CORS e links públicos compartilham a mesma origem de verdade.
// FRONTEND_URL aceita várias URLs separadas por vírgula (o Vercel cria
// mais de um domínio para o mesmo site) e tolera barra no final.
const raw = process.env.FRONTEND_URL ?? 'http://localhost:5173'

export const allowedOrigins = raw
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))

// URL canônica usada para montar links enviados ao cliente (WhatsApp).
// Convenção: a primeira URL da lista é a principal.
export const publicSiteUrl = allowedOrigins[0]
