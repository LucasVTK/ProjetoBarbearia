import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

export const clientsService = {

  async list(barbershopId: string, search?: string) {
    const clients = await prisma.client.findMany({
      where: {
        barbershopId,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        } : {}),
      },
      include: {
        appointments: {
          where: { status: 'DONE' },
          select: { price: true, date: true },
          orderBy: { date: 'desc' },
        },
        _count: { select: { appointments: true } },
      },
      orderBy: { name: 'asc' },
    })

    return clients.map(c => {
      const done        = c.appointments
      const totalSpent  = done.reduce((s, a) => s + parseFloat(String(a.price)), 0)
      const lastVisit   = done[0]?.date ?? null

      return {
        id:          c.id,
        name:        c.name,
        phone:       c.phone,
        notes:       c.notes,
        noShowCount: c.noShowCount,
        totalVisits: done.length,
        totalSpent,
        lastVisit,
        createdAt:   c.createdAt,
      }
    })
  },

  async getById(id: string, barbershopId: string) {
    const client = await prisma.client.findFirst({
      where: { id, barbershopId },
      include: {
        appointments: {
          include: {
            service:      { select: { name: true } },
            professional: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    })
    if (!client) throw new AppError('Cliente não encontrado', 404)

    const done       = client.appointments.filter(a => a.status === 'DONE')
    const totalSpent = done.reduce((s, a) => s + parseFloat(String(a.price)), 0)

    return {
      id:          client.id,
      name:        client.name,
      phone:       client.phone,
      notes:       client.notes,
      noShowCount: client.noShowCount,
      totalVisits: done.length,
      totalSpent,
      createdAt:   client.createdAt,
      appointments: client.appointments.map(a => ({
        id:           a.id,
        date:         a.date,
        status:       a.status,
        price:        a.price,
        service:      a.service.name,
        professional: a.professional.name,
      })),
    }
  },

  // Atualiza nome e/ou anotações — só o barbeiro pode (rota autenticada)
  async update(id: string, barbershopId: string, input: { name?: string; notes?: string }) {
    const client = await prisma.client.findFirst({ where: { id, barbershopId } })
    if (!client) throw new AppError('Cliente não encontrado', 404)

    return prisma.client.update({
      where: { id },
      data: input,
      select: { id: true, name: true, notes: true },
    })
  },
}
