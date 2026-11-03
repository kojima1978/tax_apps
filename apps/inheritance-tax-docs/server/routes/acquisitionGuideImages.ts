import { Router } from 'express';
import multer from 'multer';
import { getDb, writeAuditLog } from '../db.js';

const GUIDE_IDS = new Set([
  'family-register', 'heir-family-register', 'family-register-broad-issuance', 'family-register-address-history', 'seal-certificate',
  'resident-record', 'bank-balance', 'securities-balance', 'insurance-payment', 'legal-heir-information',
]);
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

type ImageRow = {
  id: number;
  guide_id: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
  deleted_at: string | null;
};

const actorFrom = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
};

const snapshot = (row: ImageRow | undefined) => row ? {
  id: row.id,
  guideId: row.guide_id,
  originalName: row.original_name,
  mimeType: row.mime_type,
  byteSize: row.byte_size,
  createdAt: row.created_at,
} : null;

export function createAcquisitionGuideImagesRouter(): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME_TYPES.has(file.mimetype)),
  });

  router.get('/', (_req, res) => {
    const rows = getDb().prepare(`
      SELECT id, guide_id, original_name, mime_type, byte_size, created_at, deleted_at
      FROM acquisition_guide_images WHERE deleted_at IS NULL ORDER BY guide_id
    `).all() as ImageRow[];
    res.json(rows.filter((row) => GUIDE_IDS.has(row.guide_id)).map((row) => ({ ...snapshot(row), contentUrl: `/inheritance-tax-docs/api/acquisition-guide-images/${row.guide_id}/content?v=${row.id}` })));
  });

  router.get('/:guideId/content', (req, res) => {
    const row = getDb().prepare(`
      SELECT mime_type, image_data FROM acquisition_guide_images
      WHERE guide_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1
    `).get(req.params.guideId) as { mime_type: string; image_data: Buffer } | undefined;
    if (!row) { res.status(404).json({ error: '見本画像が見つかりません' }); return; }
    res.type(row.mime_type).set('Cache-Control', 'private, max-age=3600').send(row.image_data);
  });

  router.put('/:guideId', (req, res, next) => {
    upload.single('image')(req, res, (error: unknown) => {
      if (!error) { next(); return; }
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? '画像は8MB以下にしてください' : 'PNG・JPEG・WebP・GIF画像を選択してください';
      res.status(400).json({ error: message });
    });
  }, (req, res) => {
    const guideId = String(req.params.guideId);
    if (!GUIDE_IDS.has(guideId)) { res.status(404).json({ error: '取得案内が見つかりません' }); return; }
    if (!req.file || !ALLOWED_MIME_TYPES.has(req.file.mimetype)) { res.status(400).json({ error: 'PNG・JPEG・WebP・GIF画像を選択してください' }); return; }
    const db = getDb();
    const previous = db.prepare(`SELECT id, guide_id, original_name, mime_type, byte_size, created_at, deleted_at FROM acquisition_guide_images WHERE guide_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`).get(guideId) as ImageRow | undefined;
    const save = db.transaction(() => {
      db.prepare("UPDATE acquisition_guide_images SET deleted_at = datetime('now') WHERE guide_id = ? AND deleted_at IS NULL").run(guideId);
      const result = db.prepare(`INSERT INTO acquisition_guide_images (guide_id, original_name, mime_type, byte_size, image_data) VALUES (?, ?, ?, ?, ?)`)
        .run(guideId, req.file!.originalname, req.file!.mimetype, req.file!.size, req.file!.buffer);
      const created = db.prepare(`SELECT id, guide_id, original_name, mime_type, byte_size, created_at, deleted_at FROM acquisition_guide_images WHERE id = ?`).get(result.lastInsertRowid) as ImageRow;
      writeAuditLog({ targetType: 'acquisition_guide_image', targetId: guideId, targetName: `取得案内画像: ${guideId}`, action: previous ? 'update' : 'create', actor: actorFrom(req.header('x-operator-name')), before: snapshot(previous), after: snapshot(created) });
      return created;
    })();
    res.json({ ...snapshot(save), contentUrl: `/inheritance-tax-docs/api/acquisition-guide-images/${guideId}/content?v=${save.id}` });
  });

  router.delete('/:guideId', (req, res) => {
    const guideId = String(req.params.guideId);
    const db = getDb();
    const previous = db.prepare(`SELECT id, guide_id, original_name, mime_type, byte_size, created_at, deleted_at FROM acquisition_guide_images WHERE guide_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`).get(guideId) as ImageRow | undefined;
    if (!previous) { res.status(404).json({ error: '見本画像が見つかりません' }); return; }
    db.transaction(() => {
      db.prepare("UPDATE acquisition_guide_images SET deleted_at = datetime('now') WHERE id = ?").run(previous.id);
      writeAuditLog({ targetType: 'acquisition_guide_image', targetId: guideId, targetName: `取得案内画像: ${guideId}`, action: 'delete', actor: actorFrom(req.header('x-operator-name')), before: snapshot(previous), after: null });
    })();
    res.json({ ok: true });
  });

  return router;
}
