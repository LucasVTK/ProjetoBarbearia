import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../../shared/middlewares/authenticate'
import { publicLimiter } from '../../shared/middlewares/rateLimiters'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'

export const barbershopRouter = Router()

// Pública — dados básicos para a página de agendamento do cliente
barbershopRouter.get('/public/:slug', publicLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Suspensa (active: false) = página pública fora do ar
    const barbershop = await prisma.barbershop.findFirst({
      where: { slug: req.params.slug, active: true },
      select: { name: true, slug: true, phone: true, address: true, description: true },
    })
    if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
    res.json(barbershop)
  } catch (err) { next(err) }
})

barbershopRouter.use(authenticate)

async function getBarbershop(userId: string) {
  const barbershop = await prisma.barbershop.findFirst({ where: { ownerId: userId } })
  if (!barbershop) throw new AppError('Barbearia não encontrada', 404)
  return barbershop
}

// GET /api/barbershop — retorna dados da barbearia do usuário logado
barbershopRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershop = await getBarbershop(req.user!.id)
    res.json(barbershop)
  } catch (err) { next(err) }
})

const updateSchema = z.object({
  name:        z.string().min(2).optional(),
  phone:       z.string().optional().nullable(),
  address:     z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

// PUT /api/barbershop — atualiza dados da barbearia
barbershopRouter.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barbershop = await getBarbershop(req.user!.id)
    const input = updateSchema.parse(req.body)

    const updated = await prisma.barbershop.update({
      where: { id: barbershop.id },
      data: input,
    })

    res.json(updated)
  } catch (err) { next(err) }
})
