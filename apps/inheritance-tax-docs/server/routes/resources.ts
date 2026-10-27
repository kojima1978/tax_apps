import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import type { Request, RequestHandler, Response } from 'express';
import {
  getDb,
  readResourceSnapshot,
  replaceResourceCompanyIds,
  writeAuditLog,
  type ResourceRow,
  type ResourceSnapshot,
} from '../db.js';

const actorFrom = (req: { header(name: string): string | undefined }): string | undefined =>
  decodeOperatorName(req.header('x-operator-name'));

const decodeOperatorName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
};

const parseCompanyIds = (value: unknown): number[] | null => {
  if (value === undefined || value === '') return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) && parsed.every(Number.isInteger) ? [...new Set(parsed as number[])] : null;
  } catch { return null; }
};

const ALLOWED_FILE_EXTENSIONS = new Set([
  '.pdf', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt',
  '.csv', '.txt', '.zip', '.jpg', '.jpeg', '.png',
]);

const decodeUploadName = (name: string): string => {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
};

const safeUploadName = (name: string): string => {
  const decoded = decodeUploadName(name);
  const basename = path.basename(decoded).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  const extension = path.extname(basename).toLowerCase();
  const stem = basename.slice(0, Math.max(0, basename.length - extension.length))
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 150) || 'file';
  return `${stem}${extension}`;
};

const parseExternalUrl = (value: unknown): { value: string | null; error?: string } => {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== 'string') return { value: null, error: '外部リンクが不正です' };
  const trimmed = value.trim();
  if (!trimmed) return { value: null };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { value: null, error: '外部リンクはhttp://またはhttps://で指定してください' };
    }
    return { value: trimmed };
  } catch {
    return { value: null, error: '外部リンクは有効なURLで指定してください' };
  }
};

const toResponse = (row: ResourceSnapshot) => ({
  ...row,
  // Old databases may contain links created before URL validation was introduced.
  url: parseExternalUrl(row.url).value,
});

export function createResourcesRouter(uploadsDir: string): Router {
  const router = Router();

  const removeNewUpload = (file: Express.Multer.File | undefined): void => {
    if (!file) return;
    const uploadRoot = path.resolve(uploadsDir);
    const target = path.resolve(uploadRoot, file.filename);
    if (path.dirname(target) === uploadRoot && fs.existsSync(target)) fs.rmSync(target);
  };

  const rejectInvalidUpload = (
    req: Request,
    res: Response,
    message: string,
  ): void => {
    removeNewUpload(req.file);
    res.status(400).json({ error: message });
  };

  // Multer setup
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      // Preserve original filename, add timestamp if duplicate
      const orig = safeUploadName(file.originalname);
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
  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const extension = path.extname(decodeUploadName(file.originalname)).toLowerCase();
      if (ALLOWED_FILE_EXTENSIONS.has(extension)) cb(null, true);
      else cb(new Error('アップロードできるのはPDF・Office文書・画像・ZIPファイルです'));
    },
  });
  const uploadSingle: RequestHandler = (req, res, next) => {
    upload.single('file')(req, res, (error: unknown) => {
      if (!error) { next(); return; }
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'ファイルサイズは50MB以下にしてください'
        : error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました';
      res.status(400).json({ error: message });
    });
  };

  // GET /api/resources/ - List all
  router.get('/', (req, res) => {
    const db = getDb();
    const companyId = req.query.companyId === undefined ? null : Number(req.query.companyId);
    // 絞り込みは SQL で行う（公開先の行が無い資料＝全社共通と、その会社の行がある資料）
    const rows = db.prepare(`
      SELECT * FROM resources
      WHERE deleted_at IS NULL
        AND (
          @companyId IS NULL
          OR id NOT IN (SELECT resource_id FROM resource_companies)
          OR id IN (SELECT resource_id FROM resource_companies WHERE company_id = @companyId)
        )
      ORDER BY sort_order ASC, id ASC
    `).all({ companyId: Number.isInteger(companyId) ? companyId : null }) as ResourceRow[];
    const byResource = new Map<number, number[]>();
    const pairs = db.prepare('SELECT resource_id, company_id FROM resource_companies ORDER BY company_id').all() as { resource_id: number; company_id: number }[];
    for (const pair of pairs) {
      const ids = byResource.get(pair.resource_id);
      if (ids) ids.push(pair.company_id);
      else byResource.set(pair.resource_id, [pair.company_id]);
    }
    res.json(rows.map((row) => toResponse({ ...row, company_ids: byResource.get(row.id) ?? [] })));
  });

  // POST /api/resources/ - Create
  router.post('/', uploadSingle, (req, res) => {
    const db = getDb();
    const { title, description, url } = req.body;
    const companyIds = parseCompanyIds(req.body.companyIds);
    if (typeof title !== 'string' || !title.trim()) {
      rejectInvalidUpload(req, res, 'タイトルは必須です');
      return;
    }
    if (!companyIds) { rejectInvalidUpload(req, res, '会社の指定が不正です'); return; }
    const parsedUrl = parseExternalUrl(url);
    if (parsedUrl.error) { rejectInvalidUpload(req, res, parsedUrl.error); return; }
    if (req.file && parsedUrl.value) {
      rejectInvalidUpload(req, res, 'ファイルと外部リンクはどちらか一方だけ指定してください');
      return;
    }
    if (!req.file && !parsedUrl.value) {
      res.status(400).json({ error: 'ファイルまたは外部リンクを指定してください' });
      return;
    }
    const filename = req.file?.filename ?? null;
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM resources WHERE deleted_at IS NULL').get() as { m: number | null }).m ?? -1;
    const create = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO resources (title, description, filename, url, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run(title.trim(), typeof description === 'string' ? description.trim() : '', filename, parsedUrl.value, maxOrder + 1);
      replaceResourceCompanyIds(result.lastInsertRowid, companyIds);
      const created = readResourceSnapshot(result.lastInsertRowid) as ResourceSnapshot;
      writeAuditLog({ targetType: 'resource', targetId: created.id, targetName: created.title, action: 'create', actor: actorFrom(req), after: created });
      return created;
    });
    const row = create();
    res.status(201).json(toResponse(row));
  });

  // PUT /api/resources/:id - Update
  router.put('/:id', uploadSingle, (req, res) => {
    const db = getDb();
    const id = String(req.params.id);
    const existing = readResourceSnapshot(id);
    if (!existing || existing.deleted_at) {
      removeNewUpload(req.file);
      res.status(404).json({ error: 'リソースが見つかりません' });
      return;
    }

    const { title, description, url, removeFile } = req.body;
    const companyIds = parseCompanyIds(req.body.companyIds);
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      rejectInvalidUpload(req, res, 'タイトルは必須です');
      return;
    }
    if (!companyIds) { rejectInvalidUpload(req, res, '会社の指定が不正です'); return; }
    const parsedUrl = parseExternalUrl(url);
    if (parsedUrl.error) { rejectInvalidUpload(req, res, parsedUrl.error); return; }
    if (req.file && parsedUrl.value) {
      rejectInvalidUpload(req, res, 'ファイルと外部リンクはどちらか一方だけ指定してください');
      return;
    }
    let filename = existing.filename;

    if (req.file) {
      // Old files are intentionally retained so audit history remains restorable.
      filename = req.file.filename;
    } else if (removeFile === 'true') {
      filename = null;
    }
    if (!filename && !parsedUrl.value) {
      rejectInvalidUpload(req, res, 'ファイルまたは外部リンクを指定してください');
      return;
    }
    const update = db.transaction(() => {
      db.prepare(
        "UPDATE resources SET title = ?, description = ?, filename = ?, url = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(
        typeof title === 'string' ? title.trim() : existing.title,
        typeof description === 'string' ? description.trim() : existing.description,
        filename,
        parsedUrl.value,
        id,
      );
      replaceResourceCompanyIds(id, companyIds);
      const updated = readResourceSnapshot(id) as ResourceSnapshot;
      writeAuditLog({ targetType: 'resource', targetId: updated.id, targetName: updated.title, action: 'update', actor: actorFrom(req), before: existing, after: updated });
      return updated;
    });
    const row = update();
    res.json(toResponse(row));
  });

  // DELETE /api/resources/:id
  router.delete('/:id', (req, res) => {
    const db = getDb();
    const id = String(req.params.id);
    const existing = readResourceSnapshot(id);
    if (!existing || existing.deleted_at) {
      res.status(404).json({ error: 'リソースが見つかりません' });
      return;
    }
    const remove = db.transaction(() => {
      db.prepare("UPDATE resources SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
      const disabled = readResourceSnapshot(id) as ResourceSnapshot;
      writeAuditLog({ targetType: 'resource', targetId: existing.id, targetName: existing.title, action: 'delete', actor: actorFrom(req), before: existing, after: disabled });
    });
    remove();
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
    const activeRows = db.prepare('SELECT * FROM resources WHERE deleted_at IS NULL ORDER BY sort_order, id').all() as ResourceRow[];
    const activeIds = new Set(activeRows.map((row) => row.id));
    if (ids.length !== activeRows.length || ids.some((id) => !activeIds.has(id))) {
      res.status(400).json({ error: '並び順の対象が現在の参考資料と一致しません' });
      return;
    }
    const update = db.prepare('UPDATE resources SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL');
    const tx = db.transaction(() => {
      ids.forEach((id, i) => update.run(i, id));
      writeAuditLog({
        targetType: 'resource',
        targetId: 'all',
        targetName: '参考資料の表示順',
        action: 'reorder',
        actor: actorFrom(req),
        before: activeRows.map(({ id, title, sort_order }) => ({ id, title, sortOrder: sort_order })),
        after: ids.map((id, sortOrder) => ({ id, title: activeRows.find((row) => row.id === id)?.title ?? '', sortOrder })),
      });
    });
    tx();
    res.json({ ok: true });
  });

  return router;
}
