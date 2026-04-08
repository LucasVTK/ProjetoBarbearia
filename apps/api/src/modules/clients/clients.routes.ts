import { Router } from 'express'
import { clientsController } from './clients.controller'
import { authenticate } from '../../shared/middlewares/authenticate'

export const clientsRouter = Router()

clientsRouter.use(authenticate)
clientsRouter.get('/',        clientsController.list)
clientsRouter.get('/:id',     clientsController.getById)
clientsRouter.patch('/:id/notes', clientsController.updateNotes)
