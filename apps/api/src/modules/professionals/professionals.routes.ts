import { Router } from 'express'
import { professionalsController } from './professionals.controller'
import { authenticate } from '../../shared/middlewares/authenticate'

export const professionalsRouter = Router()

professionalsRouter.use(authenticate)
professionalsRouter.get('/',              professionalsController.list)
professionalsRouter.post('/',             professionalsController.create)
professionalsRouter.put('/:id',           professionalsController.update)
professionalsRouter.patch('/:id/toggle',  professionalsController.toggleActive)
