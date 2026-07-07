import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

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
  // Janelas sobrepostas no mesmo dia gerariam slots duplicados na
  // tela do cliente (o gerador itera cada janela de forma independente)
  ).superRefine((schedules, ctx) => {
    const byDay = new Map<number, { startTime: string; endTime: string }[]>()
    for (const s of schedules) {
      if (!byDay.has(s.dayOfWeek)) byDay.set(s.dayOfWeek, [])
      byDay.get(s.dayOfWeek)!.push(s)
    }
    for (const [day, windows] of byDay) {
      const sorted = [...windows].sort((a, b) => a.startTime.localeCompare(b.startTime))
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          ctx.addIssue({
            code: 'custom',
            message: `Os horários de ${DAY_NAMES[day]} se sobrepõem (${sorted[i - 1].startTime}–${sorted[i - 1].endTime} e ${sorted[i].startTime}–${sorted[i].endTime})`,
          })
          return
        }
      }
    }
  }),
})

// Query da rota pública de slots — sem validação, uuid/data malformados
// chegariam ao banco e virariam erro 500
export const getSlotsQuerySchema = z.object({
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida, use AAAA-MM-DD'),
  serviceId:      z.uuid('serviceId inválido'),
  professionalId: z.uuid('professionalId inválido').optional(),
})

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>
