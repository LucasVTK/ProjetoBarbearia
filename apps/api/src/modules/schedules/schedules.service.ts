import { prisma } from '../../config/database'
import type { UpsertScheduleInput } from './schedules.schema'

export const schedulesService = {

  // Busca horários de um profissional
  async list(barbershopId: string, professionalId: string) {
    return prisma.schedule.findMany({
      where: { barbershopId, professionalId },
      orderBy: { dayOfWeek: 'asc' },
    })
  },

  // Salva todos os horários de uma vez (substitui os antigos)
  async upsert(barbershopId: string, input: UpsertScheduleInput) {
    const { professionalId, schedules } = input

    await prisma.$transaction(async (tx) => {
      // Remove todos os horários anteriores do profissional
      await tx.schedule.deleteMany({ where: { barbershopId, professionalId } })

      // Cria os novos
      if (schedules.length > 0) {
        await tx.schedule.createMany({
          data: schedules.map(s => ({
            barbershopId,
            professionalId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime:   s.endTime,
            active:    s.active,
          })),
        })
      }
    })

    return prisma.schedule.findMany({
      where: { barbershopId, professionalId },
      orderBy: { dayOfWeek: 'asc' },
    })
  },

  // Gera slots de tempo disponíveis para uma data específica
  async getAvailableSlots(barbershopId: string, professionalId: string, date: Date, serviceDuration: number) {
    const dayOfWeek = date.getDay() // 0=Dom, 1=Seg...

    // Busca horários de trabalho do profissional nesse dia
    const daySchedules = await prisma.schedule.findMany({
      where: { barbershopId, professionalId, dayOfWeek, active: true },
      orderBy: { startTime: 'asc' },
    })

    if (daySchedules.length === 0) return []

    // Busca agendamentos já existentes nessa data
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { date: true, endTime: true },
    })

    const slots: string[] = []

    for (const schedule of daySchedules) {
      const [startH, startM] = schedule.startTime.split(':').map(Number)
      const [endH, endM]     = schedule.endTime.split(':').map(Number)

      let current = startH * 60 + startM
      const end   = endH * 60 + endM

      while (current + serviceDuration <= end) {
        const slotStart = new Date(date)
        slotStart.setHours(Math.floor(current / 60), current % 60, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)

        // Verifica se o slot conflita com algum agendamento existente
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.date)
          const aptEnd   = new Date(apt.endTime)
          return slotStart < aptEnd && slotEnd > aptStart
        })

        // Não mostra slots no passado
        const isPast = slotStart <= new Date()

        if (!hasConflict && !isPast) {
          const h = String(Math.floor(current / 60)).padStart(2, '0')
          const m = String(current % 60).padStart(2, '0')
          slots.push(`${h}:${m}`)
        }

        current += 30 // incremento de 30 em 30 minutos
      }
    }

    // Dados antigos podem ter janelas sobrepostas — nunca devolver
    // o mesmo horário duas vezes ("HH:MM" ordena certo como string)
    return [...new Set(slots)].sort()
  },
}
