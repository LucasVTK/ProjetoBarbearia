import { Router } from 'express'
import { servicesController } from './services.controller'
import { authenticate } from '../../shared/middlewares/authenticate'

export const servicesRouter = Router()

// Pública — app do cliente busca serviços pelo slug da barbearia
servicesRouter.get('/public/:slug', servicesController.listPublic)

// Protegidas — painel do barbeiro
servicesRouter.use(authenticate)
servicesRouter.get('/',       servicesController.list)
servicesRouter.post('/',      servicesController.create)
servicesRouter.put('/:id',    servicesController.update)
servicesRouter.delete('/:id', servicesController.delete)
