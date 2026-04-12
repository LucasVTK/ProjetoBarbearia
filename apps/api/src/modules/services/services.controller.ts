import { Request, Response, NextFunction } from 'express'
import { createServiceSchema, updateServiceSchema } from './services.schema'
import { servicesService } from './services.service'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

export const servicesController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const services = await servicesService.list(barbershopId)
      res.json(services)
    } catch (err) { next(err) }
  },

  // Rota pública — usada pelo app do cliente via slug da barbearia
  async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
      if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
      const services = await servicesService.listActive(barbershop.id)
      res.json(services)
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = createServiceSchema.parse(req.body)
      const service = await servicesService.create(barbershopId, input)
      res.status(201).json(service)
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = updateServiceSchema.parse(req.body)
      const service = await servicesService.update(req.params.id, barbershopId, input)
      res.json(service)
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      await servicesService.delete(req.params.id, barbershopId)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}
