import { PrismaClient } from '@prisma/client';

// tsx watch は再起動のたびにモジュールを読み直すため、グローバルに退避して
// コネクションが積み上がるのを防ぐ（本番は1回しか生成されない）。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
