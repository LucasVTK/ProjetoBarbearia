import { Request, Response, NextFunction } from 'express'
import { upsertScheduleSchema } from './schedules.schema'
import { schedulesService } from './schedules.service'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

async function getBarbershopId(userId: string) {
  const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: userId } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop.id
}

export const schedulesController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId   = await getBarbershopId(req.user!.id)
      const professionalId = req.query.professionalId as string
      if (!professionalId) throw new AppError('professionalId obrigatório', 400)

      const schedules = await schedulesService.list(barbershopId, professionalId)
      res.json(schedules)
    } catch (err) { next(err) }
  },

  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = upsertScheduleSchema.parse(req.body)
      const schedules = await schedulesService.upsert(barbershopId, input)
      res.json(schedules)
    } catch (err) { next(err) }
  },

  // Rota pública — retorna slots disponíveis para o app do cliente
  async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      const { date, serviceId, professionalId } = req.query as Record<string, string>

      if (!date || !serviceId) throw new AppError('date e serviceId são obrigatórios', 400)

      const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
      if (!barbershop) throw new AppError('Barbearia não encontrada', 404)

      const service = await prisma.service.findFirst({
        where: { id: serviceId, barbershopId: barbershop.id },
      })
      if (!service) throw new AppError('Serviço não encontrado', 404)

      // Se não informou profissional, usa o primeiro profissional ativo
      let profId = professionalId
      if (!profId) {
        const prof = await prisma.professional.findFirst({
          where: { barbershopId: barbershop.id, active: true },
        })
        if (!prof) throw new AppError('Nenhum profissional disponível', 404)
        profId = prof.id
      }

      const slots = await schedulesService.getAvailableSlots(
        barbershop.id,
        profId,
        new Date(date),
        Number(service.duration)
      )

      res.json({ slots, professionalId: profId })
    } catch (err) { next(err) }
  },
}
