import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'
import { notificationsService } from './notifications.service'

export const notificationsRouter = Router()

notificationsRouter.use(authenticate)

// GET /api/notifications — sino do painel (últimas 20 + contador de não lidas)
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershopId = await getBarbershopId(req.user!.id)
    const result = await notificationsService.listForOwner(barbershopId)
    res.json(result)
  } catch (err) { next(err) }
})

// PATCH /api/notifications/read — marca todas como lidas
notificationsRouter.patch('/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershopId = await getBarbershopId(req.user!.id)
    await notificationsService.markAllRead(barbershopId)
    res.json({ message: 'Notificações marcadas como lidas' })
  } catch (err) { next(err) }
})
