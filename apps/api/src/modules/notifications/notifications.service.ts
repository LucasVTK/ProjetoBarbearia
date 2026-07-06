import { prisma } from '../../config/database'
import { sendWhatsApp } from '../../shared/whatsapp/sendWhatsApp'

// Dados mínimos de um agendamento para montar as mensagens
interface AppointmentInfo {
  id: string
  barbershopId: string
  date: Date
  cancelToken: string
  client: { name: string; phone: string }
  service: { name: string }
  professional: { name: string }
  barbershop: { name: string }
}

function frontendUrl() {
  return process.env.FRONTEND_URL ?? 'http://localhost:5173'
}

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]
}

// Carrega o agendamento com tudo que as mensagens precisam
async function loadAppointment(id: string): Promise<AppointmentInfo | null> {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      client:       { select: { name: true, phone: true } },
      service:      { select: { name: true } },
      professional: { select: { name: true } },
      barbershop:   { select: { name: true } },
    },
  })
}

// Cria o registro e envia imediatamente (quando tem telefone)
async function createAndDeliver(data: {
  barbershopId: string
  appointmentId: string
  type: 'CONFIRMATION' | 'REMINDER' | 'CANCELLATION' | 'NEW_APPOINTMENT'
  recipient: 'CLIENT' | 'OWNER'
  phone: string | null
  message: string
}) {
  const notification = await prisma.notification.create({ data })

  if (!data.phone) {
    // Sem telefone: é só notificação do painel (sino) — nada a enviar
    await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    })
    return
  }

  try {
    await sendWhatsApp(data.phone, data.message)
    await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    })
  } catch (err) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { error: err instanceof Error ? err.message : String(err) },
    })
  }
}

export const notificationsService = {

  // ── Agendamento novo → avisa o barbeiro (sino + WhatsApp) ─────────
  async notifyNewAppointment(appointmentId: string) {
    const apt = await loadAppointment(appointmentId)
    if (!apt) return

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: apt.barbershopId },
      include: { owner: { select: { phone: true } } },
    })

    const message =
      `📆 Novo agendamento na ${apt.barbershop.name}!\n` +
      `👤 ${apt.client.name} (${apt.client.phone})\n` +
      `✂️ ${apt.service.name} com ${apt.professional.name}\n` +
      `🗓 ${formatDate(apt.date)} às ${formatTime(apt.date)}`

    await createAndDeliver({
      barbershopId:  apt.barbershopId,
      appointmentId: apt.id,
      type:          'NEW_APPOINTMENT',
      recipient:     'OWNER',
      phone:         barbershop?.owner.phone ?? null,
      message,
    })
  },

  // ── Barbeiro confirmou → cliente recebe confirmação + link ────────
  async sendClientConfirmation(appointmentId: string) {
    const apt = await loadAppointment(appointmentId)
    if (!apt) return

    const cancelLink = `${frontendUrl()}/cancelar/${apt.cancelToken}`
    const message =
      `Olá, ${firstName(apt.client.name)}! ✅\n` +
      `Seu agendamento na ${apt.barbershop.name} foi confirmado:\n` +
      `✂️ ${apt.service.name} com ${apt.professional.name}\n` +
      `🗓 ${formatDate(apt.date)} às ${formatTime(apt.date)}\n\n` +
      `Precisa cancelar? Use este link (até 2h antes):\n${cancelLink}`

    await createAndDeliver({
      barbershopId:  apt.barbershopId,
      appointmentId: apt.id,
      type:          'CONFIRMATION',
      recipient:     'CLIENT',
      phone:         apt.client.phone,
      message,
    })

    await this.scheduleClientReminder(apt)
  },

  // ── Agenda o lembrete para 24h antes do horário ────────────────────
  async scheduleClientReminder(apt: AppointmentInfo) {
    const scheduledFor = new Date(apt.date.getTime() - 24 * 60 * 60 * 1000)
    if (scheduledFor <= new Date()) return // falta menos de 24h — sem lembrete

    // Evita lembrete duplicado se o barbeiro confirmar duas vezes
    const existing = await prisma.notification.findFirst({
      where: { appointmentId: apt.id, type: 'REMINDER' },
    })
    if (existing) return

    const cancelLink = `${frontendUrl()}/cancelar/${apt.cancelToken}`
    const message =
      `Oi, ${firstName(apt.client.name)}! ⏰\n` +
      `Lembrete: amanhã às ${formatTime(apt.date)} você tem ` +
      `${apt.service.name} com ${apt.professional.name} na ${apt.barbershop.name}.\n\n` +
      `Não vai poder vir? Cancele em:\n${cancelLink}`

    await prisma.notification.create({
      data: {
        barbershopId:  apt.barbershopId,
        appointmentId: apt.id,
        type:          'REMINDER',
        recipient:     'CLIENT',
        phone:         apt.client.phone,
        message,
        scheduledFor,
      },
    })
  },

  // ── Cancelamento → avisa a outra parte ────────────────────────────
  async notifyCancellation(appointmentId: string, cancelledBy: 'CLIENT' | 'OWNER') {
    const apt = await loadAppointment(appointmentId)
    if (!apt) return

    if (cancelledBy === 'CLIENT') {
      // Cliente cancelou pelo link → sino do barbeiro
      const message =
        `❌ Cancelamento: ${apt.client.name} cancelou ` +
        `${apt.service.name} de ${formatDate(apt.date)} às ${formatTime(apt.date)}.`

      await createAndDeliver({
        barbershopId:  apt.barbershopId,
        appointmentId: apt.id,
        type:          'CANCELLATION',
        recipient:     'OWNER',
        phone:         null, // só painel — sem WhatsApp para não virar spam
        message,
      })
    } else {
      // Barbeiro cancelou → WhatsApp para o cliente
      const message =
        `Olá, ${firstName(apt.client.name)}. 😕\n` +
        `Seu agendamento de ${apt.service.name} na ${apt.barbershop.name} ` +
        `(${formatDate(apt.date)} às ${formatTime(apt.date)}) foi cancelado pela barbearia.\n` +
        `Acesse ${frontendUrl()} para reagendar.`

      await createAndDeliver({
        barbershopId:  apt.barbershopId,
        appointmentId: apt.id,
        type:          'CANCELLATION',
        recipient:     'CLIENT',
        phone:         apt.client.phone,
        message,
      })
    }
  },

  // ── Processa lembretes agendados (roda a cada minuto) ─────────────
  async processScheduled() {
    const due = await prisma.notification.findMany({
      where: {
        sentAt: null,
        error: null,
        scheduledFor: { not: null, lte: new Date() },
      },
      include: { appointment: { select: { status: true } } },
      take: 50,
    })

    for (const notification of due) {
      // Agendamento cancelado/concluído depois que o lembrete foi criado
      if (!['PENDING', 'CONFIRMED'].includes(notification.appointment.status)) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { error: 'Agendamento não está mais ativo — lembrete descartado' },
        })
        continue
      }

      try {
        await sendWhatsApp(notification.phone!, notification.message)
        await prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        })
      } catch (err) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { error: err instanceof Error ? err.message : String(err) },
        })
      }
    }
  },

  // ── Sino do painel ─────────────────────────────────────────────────
  async listForOwner(barbershopId: string) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { barbershopId, recipient: 'OWNER' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, type: true, message: true, readAt: true, createdAt: true,
          appointmentId: true,
          appointment: { select: { date: true } }, // p/ navegar direto ao dia na agenda
        },
      }),
      prisma.notification.count({
        where: { barbershopId, recipient: 'OWNER', readAt: null },
      }),
    ])
    return { notifications, unreadCount }
  },

  async markAllRead(barbershopId: string) {
    await prisma.notification.updateMany({
      where: { barbershopId, recipient: 'OWNER', readAt: null },
      data: { readAt: new Date() },
    })
  },
}
