import rateLimit from 'express-rate-limit'

// Protege login/registro contra força bruta (por IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
})

// Refresh acontece com frequência legítima — limite mais folgado
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
})

// Protege o agendamento público contra spam
export const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos agendamentos em sequência. Aguarde alguns minutos.' },
})

// Endpoints públicos de leitura (serviços, slots, dados da barbearia) —
// folgado para uso normal, mas barra scraping/flood
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
})
