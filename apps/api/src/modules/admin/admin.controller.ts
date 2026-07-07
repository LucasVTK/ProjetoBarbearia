import { Request, Response, NextFunction } from 'express'
import { adminService } from './admin.service'
import { suspendSchema, deleteBarbershopSchema, listQuerySchema } from './admin.schema'
import { prisma } from '../../config/database'
import { getClientIp } from '../../shared/helpers/getClientIp'

// Contexto de auditoria: quem está agindo e de onde.
// O requirePlatformAdmin já garantiu que o usuário existe e é admin.
async function adminContext(req: Request) {
  const admin = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true },
  })
  return { adminUserId: admin!.id, adminName: admin!.name, ip: getClientIp(req) }
}

export const adminController = {

  async overview(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await adminService.overview())
    } catch (err) { next(err) }
  },

  async listBarbershops(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query)
      res.json(await adminService.listBarbershops(query))
    } catch (err) { next(err) }
  },

  async getBarbershop(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await adminContext(req)
      res.json(await adminService.getBarbershop(req.params.id, ctx))
    } catch (err) { next(err) }
  },

  async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = suspendSchema.parse(req.body ?? {})
      const ctx = await adminContext(req)
      res.json(await adminService.suspend(req.params.id, reason, ctx))
    } catch (err) { next(err) }
  },

  async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await adminContext(req)
      res.json(await adminService.reactivate(req.params.id, ctx))
    } catch (err) { next(err) }
  },

  async deleteBarbershop(req: Request, res: Response, next: NextFunction) {
    try {
      const { confirmName, password } = deleteBarbershopSchema.parse(req.body)
      const ctx = await adminContext(req)
      res.json(await adminService.deleteBarbershop(req.params.id, confirmName, password, ctx))
    } catch (err) { next(err) }
  },

  async listAudit(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await adminService.listAudit())
    } catch (err) { next(err) }
  },
}
