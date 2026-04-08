import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'
import type { CreateServiceInput, UpdateServiceInput } from './services.schema'

export const servicesService = {

  // Lista todos os serviços da barbearia
  async list(barbershopId: string) {
    return prisma.service.findMany({
      where: { barbershopId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
  },

  // Lista apenas serviços ativos — usado no app do cliente
  async listActive(barbershopId: string) {
    return prisma.service.findMany({
      where: { barbershopId, active: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
  },

  // Cria um novo serviço
  async create(barbershopId: string, input: CreateServiceInput) {
    return prisma.service.create({
      data: { ...input, barbershopId },
    })
  },

  // Atualiza um serviço — verifica se pertence à barbearia
  async update(id: string, barbershopId: string, input: UpdateServiceInput) {
    const service = await prisma.service.findFirst({
      where: { id, barbershopId },
    })
    if (!service) throw new AppError('Serviço não encontrado', 404)

    return prisma.service.update({
      where: { id },
      data: input,
    })
  },

  // Remove um serviço — só permite se não tiver agendamentos futuros
  async delete(id: string, barbershopId: string) {
    const service = await prisma.service.findFirst({
      where: { id, barbershopId },
    })
    if (!service) throw new AppError('Serviço não encontrado', 404)

    const futureAppointments = await prisma.appointment.count({
      where: {
        serviceId: id,
        date: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })

    if (futureAppointments > 0) {
      throw new AppError(
        'Não é possível excluir um serviço com agendamentos futuros. Desative-o em vez disso.',
        400
      )
    }

    return prisma.service.delete({ where: { id } })
  },
}
