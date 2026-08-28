import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

// Round-trips to the real database so a 200 here actually means something —
// not just "the process started," but "the app can talk to Postgres."
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    console.error('Health check DB query failed:', err)
    res.status(503).json({ status: 'error', db: 'unreachable' })
  }
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

app.listen(PORT, () => {
  console.log(`Daily backend listening on port ${PORT}`)
})
