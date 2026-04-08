import { Request, Response, NextFunction } from 'express'
import { registerSchema, loginSchema, refreshSchema } from './auth.schema'
import { authService } from './auth.service'

export const authController = {

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body)
      const result = await authService.register(input)
      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body)
      const result = await authService.login(input)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)
      const result = await authService.refresh(refreshToken)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)
      await authService.logout(refreshToken)
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
