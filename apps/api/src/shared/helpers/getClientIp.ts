import { Request } from 'express'

// Atrás do proxy do Vercel, req.ip é o IP do proxy. O IP real do
// visitante vem em x-vercel-forwarded-for (o Vercel sobrescreve
// qualquer valor vindo de fora). Acesso direto à API cai no req.ip.
export function getClientIp(req: Request): string {
  const header = req.headers['x-vercel-forwarded-for']
  const ip = (Array.isArray(header) ? header[0] : header)?.split(',')[0]?.trim()
  return ip || req.ip || ''
}
