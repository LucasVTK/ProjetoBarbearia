import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/AppError'
import type { RegisterInput, LoginInput } from './auth.schema'

// Gera slug a partir do nome da barbearia
// Ex: "Barbearia do João" → "barbearia-do-joao"
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function generateAccessToken(userId: string, role: string) {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' }
  )
}

function generateRefreshToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d' }
  )
}

export const authService = {

  // ── REGISTER ──────────────────────────────────────────────
  async register(input: RegisterInput) {
    // 1. Verifica se o e-mail já está em uso
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    })
    if (existing) throw new AppError('E-mail já cadastrado', 409)

    // 2. Gera slug único para a barbearia
    let slug = toSlug(input.barbershopName)
    const slugExists = await prisma.barbershop.findUnique({ where: { slug } })
    if (slugExists) slug = `${slug}-${Date.now()}`

    // 3. Hash da senha — NUNCA salvar em texto puro
    const passwordHash = await bcrypt.hash(input.password, 12)

    // 4. Cria usuário + barbearia numa única transação
    // Se qualquer parte falhar, nada é salvo (tudo ou nada)
    const { user, barbershop } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:         input.ownerName,
          email:        input.email,
          phone:        input.phone,
          passwordHash,
          role:         'OWNER',
        },
      })

      const barbershop = await tx.barbershop.create({
        data: {
          name:    input.barbershopName,
          slug,
          ownerId: user.id,
        },
      })

      return { user, barbershop }
    })

    // 5. Gera tokens
    const accessToken  = generateAccessToken(user.id, user.role)
    const refreshToken = generateRefreshToken(user.id)

    // 6. Salva refresh token no banco com expiração de 7 dias
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      barbershop: { id: barbershop.id, name: barbershop.name, slug: barbershop.slug },
    }
  },

  // ── LOGIN ─────────────────────────────────────────────────
  async login(input: LoginInput) {
    // 1. Busca usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { ownedBarbershop: true },
    })

    // Mensagem genérica — não revela se o e-mail existe ou não
    if (!user) throw new AppError('E-mail ou senha incorretos', 401)
    if (!user.active) throw new AppError('Conta desativada', 403)

    // 2. Compara senha com o hash
    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
    if (!passwordMatch) throw new AppError('E-mail ou senha incorretos', 401)

    // 3. Gera tokens
    const accessToken  = generateAccessToken(user.id, user.role)
    const refreshToken = generateRefreshToken(user.id)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      barbershop: user.ownedBarbershop
        ? { id: user.ownedBarbershop.id, name: user.ownedBarbershop.name, slug: user.ownedBarbershop.slug }
        : null,
    }
  },

  // ── REFRESH TOKEN ─────────────────────────────────────────
  async refresh(token: string) {
    // 1. Verifica se o token é válido
    let payload: { sub: string }
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { sub: string }
    } catch {
      throw new AppError('Refresh token inválido', 401)
    }

    // 2. Verifica se o token existe no banco e não expirou
    const stored = await prisma.refreshToken.findUnique({ where: { token } })
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Sessão expirada. Faça login novamente.', 401)
    }

    // 3. Busca o usuário
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.active) throw new AppError('Usuário não encontrado', 401)

    // 4. Rotaciona o refresh token (invalida o antigo, gera um novo)
    const newRefreshToken = generateRefreshToken(user.id)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token } }),
      prisma.refreshToken.create({
        data: { token: newRefreshToken, userId: user.id, expiresAt },
      }),
    ])

    return {
      accessToken:  generateAccessToken(user.id, user.role),
      refreshToken: newRefreshToken,
    }
  },

  // ── LOGOUT ────────────────────────────────────────────────
  async logout(token: string) {
    // Remove o refresh token do banco — sessão encerrada
    await prisma.refreshToken.deleteMany({ where: { token } })
  },
}
