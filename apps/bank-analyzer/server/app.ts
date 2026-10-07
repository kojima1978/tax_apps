// API の組み立て。DB を外から渡す形にしてあるのは、テストで使い捨ての DB や
// 差し替えを渡すため。起動は index.ts。

import { Hono } from 'hono';
import type { PrismaClient } from '@prisma/client';
import { caseRouter } from './routes/common.js';
import { caseRoutes } from './routes/cases.js';
import { categoryRoutes } from './routes/categories.js';
import { transactionRoutes } from './routes/transactions.js';

// 並行稼働の間の仮のパス。切り替え（段階7）で '/bank-analyzer' に戻す。
// vite.config.ts の base と必ずそろえること。
export const BASE_PATH = '/bank-analyzer-next';

export function createApp(db: PrismaClient) {
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

  // /api/cases 以下はすべて1つのルーターに載せる（routes/common.ts）
  const cases = caseRouter(db);
  caseRoutes(cases, db);
  transactionRoutes(cases, db);
  categoryRoutes(cases, db);
  app.route(`${BASE_PATH}/api/cases`, cases);

  // 例外の中身（SQL や内部のパス）は画面に出さない。ログにだけ残す。
  app.onError((error, c) => {
    console.error('[api] 処理中にエラー:', error);
    return c.json({ success: false, error: 'サーバーエラーが発生しました' }, 500);
  });

  return app;
}
