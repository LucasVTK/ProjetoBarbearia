import { prisma } from '../../config/database'

export const professionalsService = {

  async list(barbershopId: string) {
    return prisma.professional.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, phone: true, active: true, createdAt: true },
    })
  },
}
