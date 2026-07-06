import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const upsertScheduleSchema = z.object({
  professionalId: z.uuid(),
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(timeRegex, 'Formato inválido, use HH:MM'),
      endTime:   z.string().regex(timeRegex, 'Formato inválido, use HH:MM'),
      active:    z.boolean().default(true),
    }).refine(s => s.startTime < s.endTime, {
      message: 'Horário inicial deve ser antes do final',
    })
  ),
})

// Query da rota pública de slots — sem validação, uuid/data malformados
// chegariam ao banco e virariam erro 500
export const getSlotsQuerySchema = z.object({
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida, use AAAA-MM-DD'),
  serviceId:      z.uuid('serviceId inválido'),
  professionalId: z.uuid('professionalId inválido').optional(),
})

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>
