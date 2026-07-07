import { Router } from 'express'
import { adminController } from './admin.controller'
import { authenticate } from '../../shared/middlewares/authenticate'
import { requirePlatformAdmin } from '../../shared/middlewares/requirePlatformAdmin'
import { adminLimiter } from '../../shared/middlewares/rateLimiters'

// Área do dono da plataforma. Três camadas em toda rota:
// rate limit próprio → JWT válido → flag platformAdmin no banco.
export const adminRouter = Router()

adminRouter.use(adminLimiter, authenticate, requirePlatformAdmin)

adminRouter.get('/overview',                    adminController.overview)
adminRouter.get('/barbershops',                 adminController.listBarbershops)
adminRouter.get('/barbershops/:id',             adminController.getBarbershop)
adminRouter.patch('/barbershops/:id/suspend',   adminController.suspend)
adminRouter.patch('/barbershops/:id/reactivate', adminController.reactivate)
adminRouter.delete('/barbershops/:id',          adminController.deleteBarbershop)
adminRouter.get('/audit',                       adminController.listAudit)
