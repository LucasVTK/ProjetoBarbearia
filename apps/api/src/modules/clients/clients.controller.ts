import { Request, Response, NextFunction } from 'express'
import { clientsService } from './clients.service'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

async function getBarbershopId(userId: string) {
  const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: userId } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop.id
}

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

  async updateNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const { notes } = req.body as { notes: string }
      const result = await clientsService.updateNotes(req.params.id, barbershopId, notes ?? '')
      res.json(result)
    } catch (err) { next(err) }
  },
}
