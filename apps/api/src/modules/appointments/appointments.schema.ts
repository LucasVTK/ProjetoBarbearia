import { z } from 'zod'

export const createAppointmentSchema = z.object({
  serviceId:      z.uuid(),
  professionalId: z.uuid(),
  date:           z.iso.datetime({ message: 'Data inválida' }),
  clientName:     z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  clientPhone:    z.string().min(10, 'Telefone inválido').max(15, 'Telefone inválido')
                    .regex(/^\d+$/, 'Telefone deve conter apenas números'),
})

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'NO_SHOW']),
  cancelReason: z.string().optional(),
})

export const cancelByTokenSchema = z.object({
  reason: z.string().optional(),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateStatusInput      = z.infer<typeof updateStatusSchema>
