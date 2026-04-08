import { Request, Response, NextFunction } from 'express'
import { createAppointmentSchema, updateStatusSchema, cancelByTokenSchema } from './appointments.schema'
import { appointmentsService } from './appointments.service'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

async function getBarbershopId(userId: string) {
  const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: userId } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop.id
}

// Busca barbearia pelo slug (rotas públicas)
async function getBarbershopBySlug(slug: string) {
  const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop
}

export const appointmentsController = {

  // Painel do barbeiro — lista por data
  async listByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const date = req.query.date as string ?? new Date().toISOString().slice(0, 10)
      const appointments = await appointmentsService.listByDate(barbershopId, date)
      res.json(appointments)
    } catch (err) { next(err) }
  },

  // Painel do barbeiro — atualiza status
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = updateStatusSchema.parse(req.body)
      const appointment = await appointmentsService.updateStatus(req.params.id, barbershopId, input)
      res.json(appointment)
    } catch (err) { next(err) }
  },

  // Público — cliente cria agendamento via slug da barbearia
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershop = await getBarbershopBySlug(req.params.slug)
      const input = createAppointmentSchema.parse(req.body)
      const appointment = await appointmentsService.create(barbershop.id, input)
      res.status(201).json(appointment)
    } catch (err) { next(err) }
  },

  // Público — cliente vê agendamento pelo token
  async getByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentsService.getByToken(req.params.token)
      res.json(appointment)
    } catch (err) { next(err) }
  },

  // Público — cliente cancela pelo token
  async cancelByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = cancelByTokenSchema.parse(req.body)
      const appointment = await appointmentsService.cancelByToken(req.params.token, reason)
      res.json(appointment)
    } catch (err) { next(err) }
  },
}
