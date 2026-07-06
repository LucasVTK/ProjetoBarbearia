import { Request, Response, NextFunction } from 'express'
import { clientsService } from './clients.service'
import { updateClientSchema } from './clients.schema'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'

export const clientsController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const search = req.query.search as string | undefined
      const clients = await clientsService.list(barbershopId, search)
      res.json(clients)
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const client = await clientsService.getById(req.params.id, barbershopId)
      res.json(client)
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = updateClientSchema.parse(req.body)
      const result = await clientsService.update(req.params.id, barbershopId, input)
      res.json(result)
    } catch (err) { next(err) }
  },
}
