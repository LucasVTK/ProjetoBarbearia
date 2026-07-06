import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate'
import { dashboardService } from './dashboard.service'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'

export const dashboardRouter = Router()

dashboardRouter.use(authenticate)

dashboardRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershopId = await getBarbershopId(req.user!.id)
    const stats = await dashboardService.getStats(barbershopId)
    res.json(stats)
  } catch (err) { next(err) }
})
