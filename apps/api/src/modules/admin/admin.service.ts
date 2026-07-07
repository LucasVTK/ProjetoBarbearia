import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'
import type { ListQuery } from './admin.schema'

const DAYS_30 = 30 * 24 * 60 * 60 * 1000
const DAYS_14 = 14 * 24 * 60 * 60 * 1000

interface AdminContext {
  adminUserId: string
  adminName: string
  ip: string
}

function audit(ctx: AdminContext, action: 'SUSPEND' | 'REACTIVATE' | 'DELETE' | 'VIEW', targetBarbershopId: string | null, detail?: string) {
  return prisma.adminAuditLog.create({
    data: {
      adminUserId: ctx.adminUserId,
      adminName:   ctx.adminName,
      action,
      targetBarbershopId,
      detail,
      ip: ctx.ip,
    },
  })
}

export const adminService = {

  // ── Visão geral da plataforma ─────────────────────────────
  async overview() {
    const since30 = new Date(Date.now() - DAYS_30)
    const since14 = new Date(Date.now() - DAYS_14)

    const [total, active, suspended, new30d, appointments30d, inactive14d] = await Promise.all([
      prisma.barbershop.count(),
      prisma.barbershop.count({ where: { active: true } }),
      prisma.barbershop.count({ where: { active: false } }),
      prisma.barbershop.count({ where: { createdAt: { gte: since30 } } }),
      prisma.appointment.count({ where: { createdAt: { gte: since30 } } }),
      prisma.barbershop.count({
        where: { active: true, appointments: { none: { createdAt: { gte: since14 } } } },
      }),
    ])

    return { total, active, suspended, new30d, appointments30d, inactive14d }
  },

  // ── Lista de barbearias com dono e atividade ──────────────
  async listBarbershops(query: ListQuery) {
    const since30 = new Date(Date.now() - DAYS_30)
    const since14 = new Date(Date.now() - DAYS_14)

    const where: Record<string, unknown> = {}
    if (query.status === 'active')    where.active = true
    if (query.status === 'suspended') where.active = false
    if (query.status === 'inactive') {
      where.active = true
      where.appointments = { none: { createdAt: { gte: since14 } } }
    }
    if (query.search) {
      where.OR = [
        { name:  { contains: query.search, mode: 'insensitive' } },
        { owner: { name:  { contains: query.search, mode: 'insensitive' } } },
        { owner: { email: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    const shops = await prisma.barbershop.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, slug: true, active: true, createdAt: true,
        owner: { select: { name: true, email: true, phone: true, platformAdmin: true } },
        _count: {
          select: {
            appointments: { where: { createdAt: { gte: since30 } } },
            clients: true,
          },
        },
        appointments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    return shops.map(s => ({
      id:        s.id,
      name:      s.name,
      slug:      s.slug,
      active:    s.active,
      createdAt: s.createdAt,
      owner: { name: s.owner.name, email: s.owner.email, phone: s.owner.phone },
      // barbearia do dono da plataforma não pode ser suspensa/excluída
      isPlatformOwner:   s.owner.platformAdmin,
      appointments30d:   s._count.appointments,
      totalClients:      s._count.clients,
      lastAppointmentAt: s.appointments[0]?.createdAt ?? null,
    }))
  },

  // ── Detalhe de uma barbearia ──────────────────────────────
  async getBarbershop(id: string, ctx: AdminContext) {
    const shop = await prisma.barbershop.findUnique({
      where: { id },
      select: {
        id: true, name: true, slug: true, active: true, createdAt: true,
        owner: { select: { name: true, email: true, phone: true, platformAdmin: true } },
        _count: { select: { services: true, clients: true, appointments: true } },
      },
    })
    if (!shop) throw new AppError('Barbearia não encontrada', 404)

    await audit(ctx, 'VIEW', shop.id, shop.name)

    return {
      ...shop,
      isPlatformOwner: shop.owner.platformAdmin,
      owner: { name: shop.owner.name, email: shop.owner.email, phone: shop.owner.phone },
    }
  },

  // ── Suspensão: bloqueia login do dono + página pública ────
  // Nada é apagado; reativar restaura tudo. Sessões do dono caem
  // na hora (refresh tokens invalidados).
  async suspend(id: string, reason: string | undefined, ctx: AdminContext) {
    const shop = await prisma.barbershop.findUnique({
      where: { id },
      include: { owner: { select: { id: true, platformAdmin: true } } },
    })
    if (!shop) throw new AppError('Barbearia não encontrada', 404)
    if (shop.owner.platformAdmin) {
      throw new AppError('A barbearia do dono da plataforma não pode ser suspensa', 400)
    }
    if (!shop.active) throw new AppError('Esta barbearia já está suspensa', 400)

    await prisma.$transaction([
      prisma.barbershop.update({ where: { id }, data: { active: false } }),
      prisma.user.update({ where: { id: shop.owner.id }, data: { active: false } }),
      prisma.refreshToken.deleteMany({ where: { userId: shop.owner.id } }),
      audit(ctx, 'SUSPEND', shop.id, reason ?? shop.name),
    ])

    return { id: shop.id, active: false }
  },

  async reactivate(id: string, ctx: AdminContext) {
    const shop = await prisma.barbershop.findUnique({
      where: { id },
      include: { owner: { select: { id: true } } },
    })
    if (!shop) throw new AppError('Barbearia não encontrada', 404)
    if (shop.active) throw new AppError('Esta barbearia já está ativa', 400)

    await prisma.$transaction([
      prisma.barbershop.update({ where: { id }, data: { active: true } }),
      prisma.user.update({ where: { id: shop.owner.id }, data: { active: true } }),
      audit(ctx, 'REACTIVATE', shop.id, shop.name),
    ])

    return { id: shop.id, active: true }
  },

  // ── Exclusão definitiva — dupla confirmação ───────────────
  async deleteBarbershop(id: string, confirmName: string, password: string, ctx: AdminContext) {
    // Re-autenticação: a senha do ADMIN de novo — um token roubado não basta
    const admin = await prisma.user.findUnique({ where: { id: ctx.adminUserId } })
    if (!admin) throw new AppError('Acesso negado', 403)
    const passwordMatch = await bcrypt.compare(password, admin.passwordHash)
    if (!passwordMatch) throw new AppError('Senha incorreta', 401)

    const shop = await prisma.barbershop.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, platformAdmin: true } },
        _count: { select: { clients: true, appointments: true } },
      },
    })
    if (!shop) throw new AppError('Barbearia não encontrada', 404)
    if (shop.owner.platformAdmin) {
      throw new AppError('A barbearia do dono da plataforma não pode ser excluída', 400)
    }
    if (confirmName.trim() !== shop.name) {
      throw new AppError('O nome digitado não confere com o nome da barbearia', 400)
    }

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { barbershopId: id } }),
      prisma.appointment.deleteMany({ where: { barbershopId: id } }),
      prisma.client.deleteMany({ where: { barbershopId: id } }),
      prisma.schedule.deleteMany({ where: { barbershopId: id } }),
      prisma.service.deleteMany({ where: { barbershopId: id } }),
      prisma.professional.deleteMany({ where: { barbershopId: id } }),
      prisma.barbershop.delete({ where: { id } }),
      prisma.user.delete({ where: { id: shop.owner.id } }), // refresh tokens caem em cascata
      audit(ctx, 'DELETE', id,
        `${shop.name} — ${shop._count.clients} clientes, ${shop._count.appointments} agendamentos`),
    ])

    return { deleted: true }
  },

  // ── Auditoria ─────────────────────────────────────────────
  async listAudit() {
    return prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  },
}
