import { Request, Response, NextFunction } from 'express'
import { createAppointmentSchema, updateStatusSchema, cancelByTokenSchema } from './appointments.schema'
import { appointmentsService } from './appointments.service'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

async function getBarbershopBySlug(slug: string) {
  const barbershop = await prisma.barbershop.findUnique({ where: { slug } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop
}

export const appointmentsController = {

  async listByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const now = new Date()
      const defaultDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      const date = (req.query.date as string) ?? defaultDate
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('Data inválida, use AAAA-MM-DD', 400)
      const appointments = await appointmentsService.listByDate(barbershopId, date)
      res.json(appointments)
    } catch (err) { next(err) }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershopId = await getBarbershopId(req.user!.id)
      const input = updateStatusSchema.parse(req.body)
      const appointment = await appointmentsService.updateStatus(req.params.id, barbershopId, input)
      res.json(appointment)
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const barbershop = await getBarbershopBySlug(req.params.slug)
      const input = createAppointmentSchema.parse(req.body)
      const appointment = await appointmentsService.create(barbershop.id, input)
      res.status(201).json(appointment)
    } catch (err) { next(err) }
  },

  async getByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentsService.getByToken(req.params.token)
      res.json(appointment)
    } catch (err) { next(err) }
  },

  async cancelByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = cancelByTokenSchema.parse(req.body)
      const appointment = await appointmentsService.cancelByToken(req.params.token, reason)
      res.json(appointment)
    } catch (err) { next(err) }
  },
}
