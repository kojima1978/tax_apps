import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { calculateInheritanceTaxApi } from './inheritance-tax-api';

const app = express();
const port = Number(process.env.APP_PORT ?? 3004);
const basePath = '/inheritance-tax-app';
const isProduction = process.env.NODE_ENV === 'production';
const httpServer = createHttpServer(app);
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT ?? port);

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

function authorize(request: Request, response: Response, next: NextFunction) {
  const apiKey = process.env.INHERITANCE_TAX_API_KEY;
  if (!apiKey || request.headers.authorization === `Bearer ${apiKey}`) {
    next();
    return;
  }
  response.status(401).json({ error: '認証に失敗しました。' });
}

app.get(`${basePath}/api/health`, (_request, response) => {
  response.json({ status: 'ok' });
});

app.post(`${basePath}/api/calculate`, authorize, (request, response, next) => {
  try {
    response.setHeader('Cache-Control', 'no-store');
    response.json(calculateInheritanceTaxApi(request.body));
  } catch (error) {
    next(error);
  }
});

app.use(`${basePath}/api`, (_request, response) => {
  response.status(404).json({ error: 'APIが見つかりません。' });
});

if (isProduction) {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const clientDirectory = path.resolve(currentDirectory, '../dist');
  app.use(basePath, express.static(clientDirectory, { index: false }));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.path.startsWith(`${basePath}/`)) {
      next();
      return;
    }
    response.sendFile(path.join(clientDirectory, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server: httpServer, clientPort: hmrClientPort } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  void next;
  if (error instanceof ZodError) {
    response.status(400).json({ error: '入力値が正しくありません。', details: error.flatten() });
    return;
  }
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: 'JSON形式が正しくありません。' });
    return;
  }
  console.error(error);
  response.status(500).json({ error: '相続税を計算できませんでした。' });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Inheritance tax app listening on http://0.0.0.0:${port}${basePath}/`);
});
