import { Request, Response, NextFunction } from 'express'
import { upsertScheduleSchema, getSlotsQuerySchema } from './schedules.schema'
import { schedulesService } from './schedules.service'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

// O professionalId vem do cliente — precisa pertencer à barbearia do
// usuário, senão um dono grava/lê horários de profissional de outra loja
async function assertProfessionalInShop(professionalId: string, barbershopId: string) {
  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, barbershopId },
  })
  if (!professional) throw new AppError('Profissional não encontrado', 404)
}

export const schedulesController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId   = await getBarbershopId(req.user!.id)
      const professionalId = req.query.professionalId as string
      if (!professionalId) throw new AppError('professionalId obrigatório', 400)
      await assertProfessionalInShop(professionalId, barbershopId)
      const schedules = await schedulesService.list(barbershopId, professionalId)
      res.json(schedules)
    } catch (err) { next(err) }
  },

  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = upsertScheduleSchema.parse(req.body)
      await assertProfessionalInShop(input.professionalId, barbershopId)
      const schedules = await schedulesService.upsert(barbershopId, input)
      res.json(schedules)
    } catch (err) { next(err) }
  },

  // Rota pública — retorna slots disponíveis para o app do cliente
  async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      const { date, serviceId, professionalId } = getSlotsQuerySchema.parse(req.query)

      const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
      if (!barbershop) throw new AppError('Barbearia não encontrada', 404)

      const service = await prisma.service.findFirst({
        where: { id: serviceId, barbershopId: barbershop.id },
      })
      if (!service) throw new AppError('Serviço não encontrado', 404)

      // Com ou sem professionalId na query, o profissional usado precisa
      // ser desta barbearia e estar ativo
      const prof = await prisma.professional.findFirst({
        where: professionalId
          ? { id: professionalId, barbershopId: barbershop.id, active: true }
          : { barbershopId: barbershop.id, active: true },
      })
      if (!prof) throw new AppError('Nenhum profissional disponível', 404)
      const profId = prof.id

      const [y, mo, d] = date.split('-').map(Number)
      const localDate = new Date(y, mo - 1, d)

      const slots = await schedulesService.getAvailableSlots(
        barbershop.id,
        profId,
        localDate,
        Number(service.duration)
      )

      res.json({ slots, professionalId: profId })
    } catch (err) { next(err) }
  },
}
