import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { seedIfEmpty } from './db.js';
import { createResourcesRouter } from './routes/resources.js';

const PORT = Number(process.env.PORT ?? 3003);
const BASE_PATH = '/inheritance-tax-docs';
const DATA_DIR = process.env.DATA_DIR ?? path.resolve('data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_FILES_DIR = path.resolve('public', 'files');
const DIST_DIR = path.resolve('dist');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed initial data
seedIfEmpty(UPLOADS_DIR, PUBLIC_FILES_DIR);

const app = express();
app.use(express.json());

// Health check
app.get(`${BASE_PATH}/api/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use(`${BASE_PATH}/api/resources`, createResourcesRouter(UPLOADS_DIR));

// Serve uploaded files
app.use(`${BASE_PATH}/files`, express.static(UPLOADS_DIR));

// Serve Vite build (production)
if (fs.existsSync(DIST_DIR)) {
  app.use(BASE_PATH, express.static(DIST_DIR));
  // SPA fallback (Express 5: named wildcard)
  app.get(`${BASE_PATH}/{*splat}`, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`inheritance-tax-docs server running on http://0.0.0.0:${PORT}${BASE_PATH}/`);
});
