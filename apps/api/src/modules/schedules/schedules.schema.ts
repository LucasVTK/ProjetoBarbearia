import { z } from 'zod'

export const upsertScheduleSchema = z.object({
  professionalId: z.string().uuid(),
  schedules: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido, use HH:MM'),
    endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido, use HH:MM'),
    active:    z.boolean().default(true),
  })),
})

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>
