// 銀行取引分析 — バックエンド（Hono + Prisma）
//
// 開発時は Vite が 3007 で動き、/bank-analyzer/api だけがこのサーバ（3107）へ
// プロキシされる（vite.config.ts）。本番はこのサーバが API と dist の両方を 3007 で配信する。

import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { prisma } from './db.js';
import { BASE_PATH, createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3007);
const DIST_RELATIVE = process.env.DIST_DIR ?? './dist';
const DIST_DIR = path.resolve(DIST_RELATIVE);

const app = createApp(prisma);

// 本番のみ: Vite のビルド成果物を同じポートで配信する（開発時は Vite 自身が配信）。
if (fs.existsSync(DIST_DIR)) {
  const stripBasePath = (requestPath: string) => requestPath.slice(BASE_PATH.length) || '/';

  app.use(`${BASE_PATH}/*`, serveStatic({ root: DIST_RELATIVE, rewriteRequestPath: stripBasePath }));

  // SPA フォールバック。API は createApp の中で解決済みなのでここには来ない。
  app.get(`${BASE_PATH}/*`, (c) => c.html(fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')));
  app.get(BASE_PATH, (c) => c.redirect(`${BASE_PATH}/`));
}

const server = serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`bank-analyzer server running on http://0.0.0.0:${info.port}${BASE_PATH}/`);
});

const shutdown = () => {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
