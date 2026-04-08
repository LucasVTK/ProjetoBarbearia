import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../shared/middlewares/authenticate'

export const authRouter = Router()

authRouter.post('/register', authController.register)
authRouter.post('/login',    authController.login)
authRouter.post('/refresh',  authController.refresh)
authRouter.post('/logout',   authController.logout)
authRouter.get('/me',        authenticate, authController.me) // rota protegida
