import './config/env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { router } from './routes'
import { errorHandler } from './shared/middlewares/errorHandler'

const app = express()
const PORT = process.env.PORT || 3333

// Necessário atrás de proxy (Railway) para o rate limit enxergar o IP real
app.set('trust proxy', 1)

// Segurança
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
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
