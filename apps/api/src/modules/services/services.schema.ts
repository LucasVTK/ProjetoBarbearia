import { z } from 'zod'

export const createServiceSchema = z.object({
  name:        z.string().min(2, 'Nome muito curto'),
  description: z.string().optional(),
  price:       z.number().positive('Preço deve ser maior que zero'),
  duration:    z.number().int().min(5, 'Duração mínima de 5 minutos'),
  type:        z.enum(['SERVICE', 'COMBO']).default('SERVICE'),
})

export const updateServiceSchema = createServiceSchema.partial().extend({
  active: z.boolean().optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
