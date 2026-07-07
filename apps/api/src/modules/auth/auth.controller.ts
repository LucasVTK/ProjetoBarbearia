import { Request, Response, NextFunction } from 'express'
import { registerSchema, loginSchema, refreshSchema } from './auth.schema'
import { authService } from './auth.service'
import { AppError } from '../../shared/errors/AppError'

const REFRESH_COOKIE = 'refreshToken'
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 dias, igual ao token

// O refresh token vive em cookie httpOnly: JavaScript não lê (imune a
// roubo por XSS). SameSite=Lax funciona porque o front acessa a API na
// mesma origem (proxy do Vercel em produção, proxy do Vite no dev).
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // dev roda em http
  sameSite: 'lax' as const,
  path: '/api/auth', // cookie só trafega nas rotas de auth
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, maxAge: REFRESH_COOKIE_MAX_AGE })
}

// Cookie primeiro; body como fallback para fronts antigos ainda em cache
function getRefreshToken(req: Request): string {
  const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined
  const fromBody = refreshSchema.parse(req.body ?? {}).refreshToken
  const token = fromCookie ?? fromBody
  if (!token) throw new AppError('Refresh token não fornecido', 401)
  return token
}

export const authController = {

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body)
      // O refresh token vai SÓ no cookie httpOnly — fora do body, um XSS
      // não consegue capturá-lo nem na resposta do login
      const { refreshToken, ...body } = await authService.register(input)
      setRefreshCookie(res, refreshToken)
      res.status(201).json(body)
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body)
      const { refreshToken, ...body } = await authService.login(input)
      setRefreshCookie(res, refreshToken)
      res.json(body)
    } catch (err) {
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, ...body } = await authService.refresh(getRefreshToken(req))
      setRefreshCookie(res, refreshToken)
      res.json(body)
    } catch (err) {
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Sem token não há sessão a invalidar — só garante o cookie limpo
      const token = req.cookies?.[REFRESH_COOKIE] ?? refreshSchema.parse(req.body ?? {}).refreshToken
      if (token) await authService.logout(token)
      res.clearCookie(REFRESH_COOKIE, cookieOptions)
      res.json({ message: 'Logout realizado com sucesso' })
    } catch (err) {
      next(err)
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ user: req.user })
    } catch (err) {
      next(err)
    }
  },
}
