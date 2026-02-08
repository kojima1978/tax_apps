/**
 * Prisma Client Configuration
 * SQLiteデータベース接続管理
 *
 * 開発環境: libsql (Turso互換)
 * Docker環境: better-sqlite3 (Dockerfile内で置換)
 */

import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

export function createAdapter() {
  return new PrismaLibSql({
    url: process.env.DATABASE_URL || 'file:./dev.db',
  });
}

const adapter = createAdapter();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

// 開発環境でのホットリロード時にインスタンスを再利用
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
