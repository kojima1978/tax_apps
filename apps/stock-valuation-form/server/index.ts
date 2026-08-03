// 取引相場のない株式の評価明細書 — バックエンド（Hono + Prisma）
//
// 開発時は Vite が 3014 で動き、/stock-valuation-form/api だけがこのサーバへ
// プロキシされる（vite.config.ts）。本番はこのサーバが API と dist の両方を配信する。

import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { prisma } from './db.js';
import { createIndustryRouter } from './routes/industry.js';
import { createIndustryAdminRouter } from './routes/industryAdmin.js';
import { seedIndustryDataIfMissing } from './seed.js';

const PORT = Number(process.env.PORT ?? 3014);
const BASE_PATH = '/stock-valuation-form';
const SEED_DATA_DIR = process.env.SEED_DATA_DIR ?? path.resolve('src/data');
const DIST_RELATIVE = process.env.DIST_DIR ?? './dist';
const DIST_DIR = path.resolve(DIST_RELATIVE);

// 取込に失敗した状態で「起動はしている」まま放置すると、業種目マスタが空のまま
// 静かに壊れ続ける。health を落として restart: unless-stopped に拾わせる。
let seedError: string | null = null;

const app = new Hono();

app.get(`${BASE_PATH}/api/health`, (c) =>
  seedError === null
    ? c.json({ status: 'ok' })
    : c.json({ status: 'degraded', error: seedError }, 503),
);

app.route(`${BASE_PATH}/api`, createIndustryRouter(prisma));
app.route(`${BASE_PATH}/api`, createIndustryAdminRouter(prisma));

// 本番のみ: Vite のビルド成果物を同じポートで配信する（開発時は Vite 自身が配信）。
if (fs.existsSync(DIST_DIR)) {
  const stripBasePath = (requestPath: string) =>
    requestPath.slice(BASE_PATH.length) || '/';

  app.use(`${BASE_PATH}/*`, serveStatic({ root: DIST_RELATIVE, rewriteRequestPath: stripBasePath }));

  // SPA フォールバック。API は上で解決済みなのでここには来ない。
  app.get(`${BASE_PATH}/*`, (c) =>
    c.html(fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')),
  );
  app.get(BASE_PATH, (c) => c.redirect(`${BASE_PATH}/`));
}

async function main() {
  try {
    const result = await seedIndustryDataIfMissing(prisma, SEED_DATA_DIR);
    console.log(
      result.skipped
        ? `[seed] ${result.label} は登録済みのため取込をスキップしました`
        : `[seed] ${result.label} を取り込みました（業種目 ${result.categoryCount} 件 / 月別株価 ${result.monthlyPriceCount} 件）`,
    );
  } catch (error) {
    seedError = error instanceof Error ? error.message : String(error);
    console.error('[seed] 業種目データの取込に失敗しました:', error);
  }

  const server = serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
    console.log(`stock-valuation-form server running on http://0.0.0.0:${info.port}${BASE_PATH}/`);
  });

  const shutdown = () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void main();
