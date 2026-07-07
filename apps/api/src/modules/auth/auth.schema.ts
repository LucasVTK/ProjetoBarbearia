import { z } from 'zod'

export const registerSchema = z.object({
  ownerName:       z.string().min(2, 'Nome muito curto'),
  barbershopName:  z.string().min(2, 'Nome da barbearia muito curto'),
  email:           z.email('E-mail inválido'),
  phone:           z.string().min(10, 'Telefone inválido'),
  password:        z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export const loginSchema = z.object({
  email:    z.email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

// O refresh token normalmente chega no cookie httpOnly; o body é
// aceito como fallback para fronts antigos ainda em cache
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput    = z.infer<typeof loginSchema>
