import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate'
import { prisma } from '../../config/database'
import { getBarbershopId } from '../../shared/helpers/getBarbershopId'

export const financeRouter = Router()

financeRouter.use(authenticate)

financeRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershopId = await getBarbershopId(req.user!.id)

    const period = (req.query.period as string) ?? 'month'
    const now = new Date()

    let start: Date
    let end: Date = new Date(now)
    end.setHours(23, 59, 59, 999)

    if (period === 'day') {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
    } else {
      // month
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        barbershopId,
        date: { gte: start, lte: end },
        status: { in: ['DONE', 'CANCELLED', 'NO_SHOW'] },
      },
      include: {
        client:  { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const done      = appointments.filter(a => a.status === 'DONE')
    const cancelled = appointments.filter(a => a.status === 'CANCELLED')
    const noShows   = appointments.filter(a => a.status === 'NO_SHOW')

    const revenue = done.reduce((s, a) => s + parseFloat(String(a.price)), 0)
    const lost    = [...cancelled, ...noShows].reduce((s, a) => s + parseFloat(String(a.price)), 0)
    const avg     = done.length > 0 ? revenue / done.length : 0

    // Top serviços por receita
    const serviceMap: Record<string, { count: number; revenue: number }> = {}
    for (const a of done) {
      const name = a.service.name
      if (!serviceMap[name]) serviceMap[name] = { count: 0, revenue: 0 }
      serviceMap[name].count++
      serviceMap[name].revenue += parseFloat(String(a.price))
    }
    const topServices = Object.entries(serviceMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)

    res.json({
      stats: {
        revenue,
        lost,
        avg,
        total:    appointments.length,
        done:     done.length,
        cancelled: cancelled.length,
        noShows:  noShows.length,
      },
      topServices,
      transactions: appointments.map(a => ({
        id:      a.id,
        date:    a.date,
        status:  a.status,
        price:   a.price,
        client:  a.client.name,
        service: a.service.name,
      })),
    })
  } catch (err) { next(err) }
})
