import { Router } from 'express'
import { appointmentsController } from './appointments.controller'
import { authenticate } from '../../shared/middlewares/authenticate'
import { bookingLimiter, publicLimiter } from '../../shared/middlewares/rateLimiters'

export const appointmentsRouter = Router()

// Públicas — app do cliente
appointmentsRouter.post('/book/:slug',           bookingLimiter, appointmentsController.create)
appointmentsRouter.get('/cancel/:token',         publicLimiter,  appointmentsController.getByToken)
appointmentsRouter.post('/cancel/:token',        publicLimiter,  appointmentsController.cancelByToken)

// Protegidas — painel do barbeiro
appointmentsRouter.use(authenticate)
appointmentsRouter.get('/',        appointmentsController.listByDate)
appointmentsRouter.patch('/:id',   appointmentsController.updateStatus)
