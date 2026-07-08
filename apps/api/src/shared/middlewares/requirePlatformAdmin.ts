import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/database'
import { AppError } from '../errors/AppError'
import { getClientIp } from '../helpers/getClientIp'

// Área do dono da plataforma. Além do JWT (authenticate roda antes),
// reconsulta o banco a CADA request: desligar users.platformAdmin
// derruba o acesso no request seguinte, sem esperar o token expirar.
// Tentativas sem permissão viram registro de auditoria (DENIED).
export async function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })

    if (!user || !user.active || !user.platformAdmin) {
      // Auditoria da tentativa — nunca pode derrubar a resposta
      prisma.adminAuditLog.create({
        data: {
          adminUserId: req.user!.id,
          adminName:   user?.name ?? 'desconhecido',
          action:      'DENIED',
          detail:      `${req.method} ${req.originalUrl}`,
          ip:          getClientIp(req),
        },
      }).catch(() => {})
      throw new AppError('Acesso negado', 403)
    }

    next()
  } catch (err) {
    next(err)
  }
}
