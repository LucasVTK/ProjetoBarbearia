import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

const professionalSelect = {
  id: true, name: true, phone: true, active: true, createdAt: true,
} as const

export const professionalsService = {

  async list(barbershopId: string) {
    const professionals = await prisma.professional.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
      select: professionalSelect,
    })
    if (professionals.length > 0) return professionals

    // Conta criada antes do profissional automático: cria agora a partir
    // dos dados do dono (plataforma unitária — o dono é o barbeiro)
    const barbershop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      include: { owner: { select: { id: true, name: true, phone: true } } },
    })
    if (!barbershop) throw new AppError('Barbearia não encontrada', 404)

    const created = await prisma.professional.create({
      data: {
        name:         barbershop.owner.name,
        phone:        barbershop.owner.phone,
        barbershopId,
        userId:       barbershop.owner.id,
      },
      select: professionalSelect,
    })
    return [created]
  },
}
