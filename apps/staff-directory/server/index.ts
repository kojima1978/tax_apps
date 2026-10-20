import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { checkDbHealth, getDb } from './db.js';
import { createApiRouter } from './api.js';

const PORT = Number(process.env.PORT ?? 3031);
const BASE_PATH = '/staff-directory';
const DIST_DIR = path.resolve('dist');
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createHttpServer(app);
app.use(express.json());

// DB が使えないときは 503 で healthcheck を落とす
app.get(`${BASE_PATH}/api/health`, (_req, res) => {
  const dbError = checkDbHealth();
  if (dbError !== null) {
    res.status(503).json({ status: 'degraded', database: dbError });
    return;
  }
  res.json({ status: 'ok', database: 'ok' });
});

app.use(`${BASE_PATH}/api`, createApiRouter(getDb()));

// 画面の配信。本番はビルド済みの dist/、dev は Vite をミドルウェアとして組み込む
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
  console.log(`staff-directory server running on http://0.0.0.0:${PORT}${BASE_PATH}/`);
});
