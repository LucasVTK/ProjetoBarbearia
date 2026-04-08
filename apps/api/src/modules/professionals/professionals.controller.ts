import { Request, Response, NextFunction } from 'express'
import { createProfessionalSchema, updateProfessionalSchema } from './professionals.schema'
import { professionalsService } from './professionals.service'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

async function getBarbershopId(userId: string) {
  const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: userId } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop.id
}

export const professionalsController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const professionals = await professionalsService.list(barbershopId)
      res.json(professionals)
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = createProfessionalSchema.parse(req.body)
      const professional = await professionalsService.create(barbershopId, input)
      res.status(201).json(professional)
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = updateProfessionalSchema.parse(req.body)
      const professional = await professionalsService.update(req.params.id, barbershopId, input)
      res.json(professional)
    } catch (err) { next(err) }
  },

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const professional = await professionalsService.toggleActive(req.params.id, barbershopId)
      res.json(professional)
    } catch (err) { next(err) }
  },
}
