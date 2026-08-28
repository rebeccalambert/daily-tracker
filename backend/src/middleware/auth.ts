import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Verifies a real signed session token (issued by POST /login), not a static
// shared key. No accounts/user-scoping beyond this — there's only ever one
// user, so a valid signature is all that matters.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    // Fail closed, not open — a misconfigured server should reject everything.
    console.error('JWT_SECRET is not set on the server')
    return res.status(500).json({ error: 'Server auth is not configured' })
  }

  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    jwt.verify(header.slice(7), jwtSecret)
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
