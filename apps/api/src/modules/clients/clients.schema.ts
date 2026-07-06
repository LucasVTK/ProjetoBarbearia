import { z } from 'zod'

export const updateClientSchema = z.object({
  name:  z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo').optional(),
  notes: z.string().max(500, 'Anotação muito longa').optional(),
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>
