import './config/env'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { allowedOrigins } from './config/urls'
import { router } from './routes'
import { errorHandler } from './shared/middlewares/errorHandler'
import { notificationsService } from './modules/notifications/notifications.service'

const app = express()
const PORT = process.env.PORT || 3333

// Necessário atrás de proxy (Railway) para o rate limit enxergar o IP real
app.set('trust proxy', 1)

// Segurança
app.use(helmet())

// CORS: lista fechada de origens permitidas.
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser()) // refresh token de sessão vive em cookie httpOnly

// Rotas
app.use('/api', router)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'BarberPro API', version: '1.0.0' })
})

// Middleware de erros — deve ser o último
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n🚀 BarberPro API rodando em http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health\n`)
})

// Agendador de lembretes: a cada minuto envia as notificações cujo
// horário programado (24h antes do corte) já chegou
function runScheduledNotifications() {
  notificationsService.processScheduled()
    .catch(err => console.error('Erro no agendador de lembretes:', err))
}
runScheduledNotifications()
setInterval(runScheduledNotifications, 60_000)
