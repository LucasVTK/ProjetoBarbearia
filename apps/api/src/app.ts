import './config/env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
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
// FRONTEND_URL aceita várias URLs separadas por vírgula (o Vercel cria
// mais de um domínio para o mesmo site) e tolera barra no final.
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())

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
