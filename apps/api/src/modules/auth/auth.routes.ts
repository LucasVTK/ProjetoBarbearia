import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authLimiter, refreshLimiter, logoutLimiter } from '../../shared/middlewares/rateLimiters'

export const authRouter = Router()

authRouter.post('/register', authLimiter,    authController.register)
authRouter.post('/login',    authLimiter,    authController.login)
authRouter.post('/refresh',  refreshLimiter, authController.refresh)
authRouter.post('/logout',   logoutLimiter,  authController.logout)
authRouter.get('/me',        authenticate, authController.me) // rota protegida
