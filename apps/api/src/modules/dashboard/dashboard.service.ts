import { prisma } from '../../config/database'

export const dashboardService = {

  async getStats(barbershopId: string) {
    const now   = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Agendamentos de hoje
    const todayAppointments = await prisma.appointment.findMany({
      where: { barbershopId, date: { gte: today, lte: todayEnd } },
      include: {
        client:       { select: { name: true, phone: true } },
        service:      { select: { name: true } },
        professional: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    const todayDone      = todayAppointments.filter(a => a.status === 'DONE')
    const todayPending   = todayAppointments.filter(a => ['PENDING', 'CONFIRMED'].includes(a.status))
    const todayRevenue   = todayDone.reduce((s, a) => s + parseFloat(String(a.price)), 0)
    const todayClients   = new Set(todayDone.map(a => a.clientId)).size

    // Ticket médio do mês
    const monthDone = await prisma.appointment.findMany({
      where: {
        barbershopId,
        status: 'DONE',
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { price: true },
    })
    const monthRevenue   = monthDone.reduce((s, a) => s + parseFloat(String(a.price)), 0)
    const avgTicket      = monthDone.length > 0 ? monthRevenue / monthDone.length : 0

    return {
      today: {
        total:   todayAppointments.length,
        done:    todayDone.length,
        pending: todayPending.length,
        revenue: todayRevenue,
        clients: todayClients,
      },
      month: {
        revenue:   monthRevenue,
        done:      monthDone.length,
        avgTicket,
      },
      appointments: todayAppointments.map(a => ({
        id:           a.id,
        date:         a.date,
        status:       a.status,
        price:        a.price,
        client:       a.client.name,
        service:      a.service.name,
        professional: a.professional.name,
      })),
    }
  },
}
