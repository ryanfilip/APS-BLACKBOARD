import { PrismaClient } from '@prisma/client';

// Singleton: evita criar várias instâncias do PrismaClient com o hot reload do nodemon.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__techdiagnosePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__techdiagnosePrisma = prisma;
}

export default prisma;
