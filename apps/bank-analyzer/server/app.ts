// API の組み立て。DB を外から渡す形にしてあるのは、テストで DB 無しに回すため
// （テスト用サービスは DB につながない）。起動は index.ts。

import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { toDateString, toId } from './json.js';

// 並行稼働の間の仮のパス。切り替え（段階7）で '/bank-analyzer' に戻す。
// vite.config.ts の base と必ずそろえること。
export const BASE_PATH = '/bank-analyzer-next';

export type AppDb = Pick<PrismaClient, '$queryRaw' | 'case'>;

export function createApp(db: AppDb) {
  const app = new Hono();

  // DB まで届くかを見る。届かないまま「起動はしている」状態で動き続けると、
  // 画面は開くのに何も読めない形で静かに壊れるので、503 にして
  // healthcheck → autoheal に拾わせる。
  app.get(`${BASE_PATH}/api/health`, async (c) => {
    try {
      await db.$queryRaw`SELECT 1`;
      return c.json({ status: 'ok' });
    } catch (error) {
      console.error('[health] DB に接続できません:', error);
      return c.json({ status: 'degraded', error: 'database unreachable' }, 503);
    }
  });

  // 案件一覧。並び順は Django 版と同じ（作成日時の新しい順）。
  app.get(`${BASE_PATH}/api/cases`, async (c) => {
    const cases = await db.case.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        referenceDate: true,
        _count: { select: { transactions: true } },
      },
    });
    return c.json(
      cases.map((row) => ({
        id: toId(row.id),
        name: row.name,
        createdAt: row.createdAt.toISOString(),
        referenceDate: toDateString(row.referenceDate),
        transactionCount: row._count.transactions,
      })),
    );
  });

  return app;
}
