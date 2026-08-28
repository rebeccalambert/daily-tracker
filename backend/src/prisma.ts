import { PrismaClient } from '@prisma/client'

// Single shared client — every route imports this instead of creating its own,
// so we're not opening a new connection pool per file.
export const prisma = new PrismaClient()
