import { Router } from 'express'
import { professionalsController } from './professionals.controller'
import { authenticate } from '../../shared/middlewares/authenticate'

// Plataforma unitária: o profissional é criado automaticamente no registro
// (o dono é o barbeiro). Só a listagem fica exposta — a tela de horários
// usa o id dele para salvar a agenda.
export const professionalsRouter = Router()

professionalsRouter.use(authenticate)
professionalsRouter.get('/', professionalsController.list)
