import { prisma } from '../../config/database'
import { AppError } from '../errors/AppError'

export async function getBarbershopId(userId: string): Promise<string> {
  const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: userId } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop.id
}
