import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'
import { schedulesService } from '../schedules/schedules.service'
import type { CreateAppointmentInput, UpdateStatusInput } from './appointments.schema'

export const appointmentsService = {

  // Lista agendamentos de uma data (painel do barbeiro)
  async listByDate(barbershopId: string, date: string) {
    const [y, m, d] = date.split('-').map(Number)
    const start = new Date(y, m - 1, d,  0,  0,  0,   0)
    const end   = new Date(y, m - 1, d, 23, 59, 59, 999)

    return prisma.appointment.findMany({
      where: {
        barbershopId,
        date: { gte: start, lte: end },
      },
      include: {
        client:       { select: { name: true, phone: true } },
        service:      { select: { name: true, duration: true } },
        professional: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })
  },

  // Cria um agendamento — valida serviço, profissional e horário oferecido
  async create(barbershopId: string, input: CreateAppointmentInput) {
    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, barbershopId, active: true },
    })
    if (!service) throw new AppError('Serviço não encontrado', 404)

    // O profissional precisa pertencer a ESTA barbearia e estar ativo
    const professional = await prisma.professional.findFirst({
      where: { id: input.professionalId, barbershopId, active: true },
    })
    if (!professional) throw new AppError('Profissional não encontrado', 404)

    const appointmentDate = new Date(input.date)
    if (appointmentDate.getTime() <= Date.now()) {
      throw new AppError('Não é possível agendar em uma data que já passou', 400)
    }

    // Só aceita horários que o sistema realmente oferece: dentro da jornada
    // do profissional, sem conflito com outros agendamentos e não no passado
    const requestedSlot =
      `${String(appointmentDate.getHours()).padStart(2, '0')}:` +
      `${String(appointmentDate.getMinutes()).padStart(2, '0')}`

    const availableSlots = await schedulesService.getAvailableSlots(
      barbershopId,
      input.professionalId,
      appointmentDate,
      Number(service.duration)
    )
    if (!availableSlots.includes(requestedSlot)) {
      throw new AppError('Horário não disponível', 409)
    }

    const endTime = new Date(appointmentDate)
    endTime.setMinutes(endTime.getMinutes() + Number(service.duration))

    // Busca ou cria o cliente pelo telefone
    const client = await prisma.client.upsert({
      where: {
        phone_barbershopId: {
          phone: input.clientPhone,
          barbershopId,
        },
      },
      create: {
        name: input.clientName,
        phone: input.clientPhone,
        barbershopId,
      },
      update: {
        name: input.clientName, // atualiza o nome se já existir
      },
    })

    try {
      return await prisma.appointment.create({
        data: {
          barbershopId,
          professionalId: input.professionalId,
          clientId:       client.id,
          serviceId:      input.serviceId,
          date:           appointmentDate,
          endTime,
          price:          service.price,
        },
        include: {
          client:  { select: { name: true, phone: true } },
          service: { select: { name: true } },
        },
      })
    } catch (err) {
      // Race condition: dois clientes confirmando o mesmo horário ao mesmo
      // tempo — o unique(professionalId, date) do banco barra o segundo
      if ((err as { code?: string }).code === 'P2002') {
        throw new AppError('Horário não disponível', 409)
      }
      throw err
    }
  },

  // Atualiza status (painel do barbeiro)
  async updateStatus(id: string, barbershopId: string, input: UpdateStatusInput) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, barbershopId },
    })
    if (!appointment) throw new AppError('Agendamento não encontrado', 404)

    // Se marcou como no-show, incrementa o contador do cliente
    // (só na transição — evita contar duas vezes o mesmo agendamento)
    if (input.status === 'NO_SHOW' && appointment.status !== 'NO_SHOW') {
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: { noShowCount: { increment: 1 } },
      })
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status:       input.status,
        cancelReason: input.cancelReason,
        cancelledAt:  ['CANCELLED', 'NO_SHOW'].includes(input.status) ? new Date() : null,
      },
    })
  },

  // Cancelamento pelo cliente via token único — com regra de 2 horas
  async cancelByToken(token: string, reason?: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { cancelToken: token },
    })

    if (!appointment) throw new AppError('Link de cancelamento inválido', 404)

    if (['CANCELLED', 'DONE', 'NO_SHOW'].includes(appointment.status)) {
      throw new AppError('Este agendamento já foi encerrado', 400)
    }

    // Regra: só pode cancelar com 2h de antecedência
    const hoursUntil = (appointment.date.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < 2) {
      throw new AppError(
        'Cancelamento não permitido com menos de 2 horas de antecedência',
        400
      )
    }

    return prisma.appointment.update({
      where: { cancelToken: token },
      data: {
        status:       'CANCELLED',
        cancelReason: reason ?? 'Cancelado pelo cliente',
        cancelledAt:  new Date(),
      },
    })
  },

  // Busca um agendamento pelo token (para a tela de cancelamento do cliente)
  async getByToken(token: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { cancelToken: token },
      include: {
        client:       { select: { name: true } },
        service:      { select: { name: true, duration: true } },
        professional: { select: { name: true } },
        barbershop:   { select: { name: true } },
      },
    })
    if (!appointment) throw new AppError('Link inválido ou expirado', 404)
    return appointment
  },
}
