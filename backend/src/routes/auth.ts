import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { verifyPassword } from '../lib/password.js'

export const authRouter = Router()

// POST /login — checks the submitted password against PASSWORD_HASH (an env
// var, set once via `npm run hash-password`). No email, no database lookup:
// there's exactly one password gating exactly one dataset, so there's nothing
// to look up — just something to verify.
authRouter.post('/login', async (req, res) => {
  const { password } = req.body ?? {}

  if (typeof password !== 'string') {
    return res.status(400).json({ error: 'password is required' })
  }

  const passwordHash = process.env.PASSWORD_HASH
  const jwtSecret = process.env.JWT_SECRET
  if (!passwordHash || !jwtSecret) {
    console.error('PASSWORD_HASH or JWT_SECRET is not set on the server')
    return res.status(500).json({ error: 'Server auth is not configured' })
  }

  if (!(await verifyPassword(password, passwordHash))) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  // Long-lived on purpose: personal single-user app on your own devices,
  // not a multi-tenant service — no refresh-token flow needed.
  const token = jwt.sign({ authenticated: true }, jwtSecret, { expiresIn: '90d' })
  res.json({ token })
})
