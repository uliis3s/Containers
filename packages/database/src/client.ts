import { PrismaClient } from '@prisma/client'

// Singleton pattern: reuse the same client instance across hot-reloads in dev.
// In production a single long-lived process is used so globalThis is irrelevant,
// but the guard prevents creating multiple connections during tests.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
