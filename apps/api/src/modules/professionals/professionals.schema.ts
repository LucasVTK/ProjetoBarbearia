import { z } from 'zod'

export const createProfessionalSchema = z.object({
  name:  z.string().min(2, 'Nome obrigatório'),
  phone: z.string().optional(),
})

export const updateProfessionalSchema = z.object({
  name:  z.string().min(2).optional(),
  phone: z.string().optional(),
})

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>
