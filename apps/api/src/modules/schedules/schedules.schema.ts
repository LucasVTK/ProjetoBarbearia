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

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>
