import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getDb, type ResourceRow } from '../db.js';

export function createResourcesRouter(uploadsDir: string): Router {
  const router = Router();

  // Multer setup
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      // Preserve original filename, add timestamp if duplicate
      const orig = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const target = path.join(uploadsDir, orig);
      if (fs.existsSync(target)) {
        const ext = path.extname(orig);
        const base = path.basename(orig, ext);
        cb(null, `${base}_${Date.now()}${ext}`);
      } else {
        cb(null, orig);
      }
    },
  });
  const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

  // GET /api/resources/ - List all
  router.get('/', (_req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM resources ORDER BY sort_order ASC, id ASC').all() as ResourceRow[];
    res.json(rows);
  });

  // POST /api/resources/ - Create (with optional file upload)
  router.post('/', upload.single('file'), (req, res) => {
    const db = getDb();
    const { title, description, url } = req.body;
    if (!title) {
      res.status(400).json({ error: 'タイトルは必須です' });
      return;
    }
    const filename = req.file
      ? Buffer.from(req.file.filename, 'latin1').toString('utf8') || req.file.filename
      : null;
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM resources').get() as { m: number | null }).m ?? -1;

    const result = db.prepare(
      'INSERT INTO resources (title, description, filename, url, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(title, description ?? '', filename, url ?? null, maxOrder + 1);

    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid) as ResourceRow;
    res.status(201).json(row);
  });

  // PUT /api/resources/:id - Update
  router.put('/:id', upload.single('file'), (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'リソースが見つかりません' });
      return;
    }

    const { title, description, url, removeFile } = req.body;
    let filename = existing.filename;

    if (req.file) {
      // Delete old file if replacing
      if (existing.filename) {
        const oldPath = path.join(uploadsDir, existing.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      filename = Buffer.from(req.file.filename, 'latin1').toString('utf8') || req.file.filename;
    } else if (removeFile === 'true') {
      if (existing.filename) {
        const oldPath = path.join(uploadsDir, existing.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      filename = null;
    }

    db.prepare(
      "UPDATE resources SET title = ?, description = ?, filename = ?, url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(title ?? existing.title, description ?? existing.description, filename, url ?? null, id);

    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow;
    res.json(row);
  });

  // DELETE /api/resources/:id
  router.delete('/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'リソースが見つかりません' });
      return;
    }
    // Delete associated file
    if (existing.filename) {
      const filePath = path.join(uploadsDir, existing.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // PATCH /api/resources/reorder - Reorder
  router.patch('/reorder', (req, res) => {
    const db = getDb();
    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'ids配列が必要です' });
      return;
    }
    const update = db.prepare('UPDATE resources SET sort_order = ? WHERE id = ?');
    const tx = db.transaction(() => {
      ids.forEach((id, i) => update.run(i, id));
    });
    tx();
    res.json({ ok: true });
  });

  return router;
}
