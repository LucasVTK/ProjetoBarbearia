import { Router } from 'express'
import { schedulesController } from './schedules.controller'
import { authenticate } from '../../shared/middlewares/authenticate'
import { publicLimiter } from '../../shared/middlewares/rateLimiters'

export const schedulesRouter = Router()

// Pública — app do cliente busca slots disponíveis
schedulesRouter.get('/slots/:slug', publicLimiter, schedulesController.getSlots)

// Protegidas — painel do barbeiro
schedulesRouter.use(authenticate)
schedulesRouter.get('/',  schedulesController.list)
schedulesRouter.post('/', schedulesController.upsert)
