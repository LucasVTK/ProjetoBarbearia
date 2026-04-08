import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'
import type { CreateProfessionalInput, UpdateProfessionalInput } from './professionals.schema'

export const professionalsService = {

  async list(barbershopId: string) {
    return prisma.professional.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, phone: true, active: true, createdAt: true,
        _count: { select: { appointments: true } },
      },
    })
  },

  async create(barbershopId: string, input: CreateProfessionalInput) {
    return prisma.professional.create({
      data: { ...input, barbershopId },
      select: { id: true, name: true, phone: true, active: true, createdAt: true },
    })
  },

  async update(id: string, barbershopId: string, input: UpdateProfessionalInput) {
    const professional = await prisma.professional.findFirst({ where: { id, barbershopId } })
    if (!professional) throw new AppError('Profissional não encontrado', 404)

    return prisma.professional.update({
      where: { id },
      data: input,
      select: { id: true, name: true, phone: true, active: true, createdAt: true },
    })
  },

  async toggleActive(id: string, barbershopId: string) {
    const professional = await prisma.professional.findFirst({ where: { id, barbershopId } })
    if (!professional) throw new AppError('Profissional não encontrado', 404)

    // Bloqueia desativar se tiver agendamentos futuros ativos
    if (professional.active) {
      const futureAppointments = await prisma.appointment.count({
        where: {
          professionalId: id,
          date: { gt: new Date() },
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      })
      if (futureAppointments > 0) {
        throw new AppError(
          `Não é possível desativar: há ${futureAppointments} agendamento(s) futuro(s) para este profissional`,
          409
        )
      }
    }

    return prisma.professional.update({
      where: { id },
      data: { active: !professional.active },
      select: { id: true, name: true, phone: true, active: true, createdAt: true },
    })
  },
}
