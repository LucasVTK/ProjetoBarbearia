import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError'

// Middleware global de erros — captura qualquer erro lançado nas rotas
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Erro esperado (ex: email já cadastrado, senha incorreta)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // Erro de validação dos dados de entrada (Zod)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message ?? 'Dados inválidos',
    })
  }

  // Violação de unicidade do banco (ex: dois agendamentos no mesmo horário)
  if ((err as { code?: string }).code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado' })
  }

  // Erro inesperado — não expõe detalhes internos para o cliente
  console.error(err)
  return res.status(500).json({ error: 'Erro interno do servidor' })
}
