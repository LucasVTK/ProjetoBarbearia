import { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

// Atrás do proxy do Vercel, req.ip é o IP do proxy — todos os usuários
// dividiriam o mesmo balde. O Vercel envia o IP real do visitante em
// x-vercel-forwarded-for (e sobrescreve qualquer valor vindo de fora).
// Acesso direto à API (sem proxy) cai no req.ip normal.
function clientIpKey(req: Request): string {
  const header = req.headers['x-vercel-forwarded-for']
  const ip = (Array.isArray(header) ? header[0] : header)?.split(',')[0]?.trim()
  return ipKeyGenerator(ip || req.ip || '')
}

// Protege login/registro contra força bruta (por IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
})

// Refresh acontece com frequência legítima — limite mais folgado
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
})

// Logout é raro — instância própria para não dividir o balde do refresh
export const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
})

// Protege o agendamento público contra spam
export const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: 'Muitos agendamentos em sequência. Aguarde alguns minutos.' },
})

// Endpoints públicos de leitura (serviços, slots, dados da barbearia) —
// folgado para uso normal, mas barra scraping/flood
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
})
