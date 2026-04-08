import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate'
import { dashboardService } from './dashboard.service'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

export const dashboardRouter = Router()

dashboardRouter.use(authenticate)

dashboardRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: req.user!.id } })
    if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
    const stats = await dashboardService.getStats(barbershop.id)
    res.json(stats)
  } catch (err) { next(err) }
})
