
// import { PrismaClient } from '@prisma/client'

// const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// export const prisma = globalForPrisma.prisma || new PrismaClient()

// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Mock implementation for Vercel deployment to avoid build errors
export const prisma: any = {}
