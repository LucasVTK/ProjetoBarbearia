import { z } from 'zod'

export const suspendSchema = z.object({
  reason: z.string().max(200, 'Motivo muito longo').optional(),
})

export const listQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['all', 'active', 'suspended', 'inactive']).default('all'),
})

export type SuspendInput = z.infer<typeof suspendSchema>
export type ListQuery = z.infer<typeof listQuerySchema>
