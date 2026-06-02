import type { NextFunction, Request, Response } from 'express'
import { TOKEN } from './config.js'

/**
 * Require a valid bearer token on protected routes.
 * Accepts `Authorization: Bearer <token>` or `?token=<token>` (handy for the
 * widget / quick checks). Privacy still rests on Tailscale limiting who can reach
 * the server at all.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : ''
  const query = typeof req.query.token === 'string' ? req.query.token : ''
  const provided = bearer || query

  if (provided && provided === TOKEN) {
    next()
    return
  }
  res.status(401).json({ error: 'unauthorized' })
}
