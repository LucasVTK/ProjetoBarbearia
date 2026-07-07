import { z } from 'zod'

export const suspendSchema = z.object({
  reason: z.string().max(200, 'Motivo muito longo').optional(),
})

// Exclusão definitiva exige dupla confirmação: o nome exato da
// barbearia E a senha do administrador de novo (token roubado não basta)
export const deleteBarbershopSchema = z.object({
  confirmName: z.string().min(1, 'Digite o nome da barbearia'),
  password:    z.string().min(1, 'Digite sua senha'),
})

export const listQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['all', 'active', 'suspended', 'inactive']).default('all'),
})

export type SuspendInput = z.infer<typeof suspendSchema>
export type DeleteBarbershopInput = z.infer<typeof deleteBarbershopSchema>
export type ListQuery = z.infer<typeof listQuerySchema>
