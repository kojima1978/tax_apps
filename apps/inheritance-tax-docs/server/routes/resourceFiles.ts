import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db.js';

export function createResourceFilesRouter(uploadsDir: string): Router {
  const router = Router();
  const uploadRoot = path.resolve(uploadsDir);

  router.get('/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const target = path.resolve(uploadRoot, filename);
    const isSafePath = filename === path.basename(filename)
      && path.dirname(target) === uploadRoot
      && !filename.startsWith('.');
    if (!isSafePath) {
      res.status(404).json({ error: 'ファイルが見つかりません' });
      return;
    }

    const active = getDb().prepare(
      'SELECT 1 FROM resources WHERE filename = ? AND deleted_at IS NULL LIMIT 1',
    ).get(filename);
    if (!active || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.status(404).json({ error: 'ファイルが見つかりません' });
      return;
    }

    res.download(target, filename, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    }, (error) => {
      if (!error) return;
      if (res.headersSent) next(error);
      else res.status(500).json({ error: 'ファイルの取得に失敗しました' });
    });
  });

  return router;
}
