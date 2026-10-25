import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { checkDbHealth, seedDocumentMastersIfEmpty, seedIfEmpty, seedPoaMatterMasterIfEmpty } from './db.js';
import { createResourcesRouter } from './routes/resources.js';
import { createDocumentMastersRouter } from './routes/documentMasters.js';
import { createAuditLogsRouter } from './routes/auditLogs.js';
import { createPoaMattersRouter } from './routes/poaMatters.js';
import { createPoaPrincipalsRouter } from './routes/poaPrincipals.js';
import { createResourceFilesRouter } from './routes/resourceFiles.js';
import { MASTER_SEEDS } from './masterDefaults.js';
import { runMasterMigrations } from './masterMigrations.js';
import { DEFAULT_MATTER_MASTER } from '../src/constants/powerOfAttorneyMatters.js';

const PORT = Number(process.env.PORT ?? 3003);
const BASE_PATH = '/inheritance-tax-docs';
const DATA_DIR = process.env.DATA_DIR ?? path.resolve('data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_FILES_DIR = path.resolve('public', 'files');
const DIST_DIR = path.resolve('dist');
const isProduction = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed initial data
seedIfEmpty(UPLOADS_DIR, PUBLIC_FILES_DIR);
seedDocumentMastersIfEmpty(MASTER_SEEDS);
seedPoaMatterMasterIfEmpty(DEFAULT_MATTER_MASTER);
runMasterMigrations();

const app = express();
const httpServer = createHttpServer(app);
app.use(express.json());

// Health check
// DB が使えないときは 503 で healthcheck を落とす（以前は DB を見ていなかった）
app.get(`${BASE_PATH}/api/health`, (_req, res) => {
  const dbError = checkDbHealth();
  if (dbError !== null) {
    res.status(503).json({ status: 'degraded', database: dbError });
    return;
  }
  res.json({ status: 'ok', database: 'ok' });
});

// API routes
app.use(`${BASE_PATH}/api/resources`, createResourcesRouter(UPLOADS_DIR));
app.use(`${BASE_PATH}/api/document-masters`, createDocumentMastersRouter());
app.use(`${BASE_PATH}/api/audit-logs`, createAuditLogsRouter());
app.use(`${BASE_PATH}/api/poa-matters`, createPoaMattersRouter());
app.use(`${BASE_PATH}/api/poa-principals`, createPoaPrincipalsRouter());

// Only active master records can expose their retained upload.
app.use(`${BASE_PATH}/files`, createResourceFilesRouter(UPLOADS_DIR));

// 画面の配信。本番はビルド済みの dist/、dev は Vite をミドルウェアとして組み込む。
// 以前は「dist/ があれば配信」だけで、dev のイメージには dist/ が無いため
// dev モードでは API しか応答せず画面は 404 だった。
if (isProduction) {
  app.use(BASE_PATH, express.static(DIST_DIR));
  // SPA fallback (Express 5: named wildcard)
  app.get(`${BASE_PATH}/{*splat}`, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  // vite は devDependencies なので本番イメージには無い。dev のときだけ読み込む
  const { createServer: createViteServer } = await import('vite');
  const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT ?? PORT);
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server: httpServer, clientPort: hmrClientPort } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`inheritance-tax-docs server running on http://0.0.0.0:${PORT}${BASE_PATH}/`);
});
