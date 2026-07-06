import { Request, Response, NextFunction } from 'express'
import { professionalsService } from './professionals.service'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'

export const professionalsController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const professionals = await professionalsService.list(barbershopId)
      res.json(professionals)
    } catch (err) { next(err) }
  },
}
