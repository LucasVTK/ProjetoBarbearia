import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../errors/AppError'

// Estende o tipo Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string }
    }
  }
}

// Middleware que protege rotas — verifica o JWT antes de deixar passar
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Token não fornecido', 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string
      role: string
    }
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    throw new AppError('Token inválido ou expirado', 401)
  }
}
