import { Router } from 'express';
import { getDb, writeAuditLog, type AuditAction, type DocumentMasterRow } from '../db.js';
import type { MasterCategory } from '../masterDefaults.js';

const parseCategories = (value: unknown): MasterCategory[] | null => {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  for (const category of value) {
    if (!category || typeof category !== 'object') return null;
    const candidate = category as Record<string, unknown>;
    if (typeof candidate.id !== 'string' || !candidate.id || ids.has(candidate.id)) return null;
    if (typeof candidate.name !== 'string' || !candidate.name.trim() || !Array.isArray(candidate.documents)) return null;
    if (candidate.isActive !== undefined && typeof candidate.isActive !== 'boolean') return null;
    ids.add(candidate.id);
    const documentIds = new Set<string>();
    for (const document of candidate.documents) {
      if (!document || typeof document !== 'object') return null;
      const doc = document as Record<string, unknown>;
      if (typeof doc.id !== 'string' || !doc.id || documentIds.has(doc.id)) return null;
      if (typeof doc.name !== 'string' || !doc.name.trim()) return null;
      if (typeof doc.description !== 'string' || typeof doc.howToGet !== 'string' || typeof doc.canDelegate !== 'boolean') return null;
      if (doc.companyIds !== undefined && (!Array.isArray(doc.companyIds) || doc.companyIds.some((id) => !Number.isInteger(id)))) return null;
      documentIds.add(doc.id);
    }
  }
  return value as MasterCategory[];
};

const getMaster = (code: string): DocumentMasterRow | undefined =>
  getDb().prepare('SELECT * FROM document_masters WHERE code = ?').get(code) as DocumentMasterRow | undefined;

const actorFrom = (req: { header(name: string): string | undefined }): string | undefined =>
  decodeOperatorName(req.header('x-operator-name'));

const decodeOperatorName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
};

const masterSnapshot = (row: DocumentMasterRow, categories: MasterCategory[]) => ({
  code: row.code,
  label: row.label,
  version: row.version,
  categories,
});

const classifyDraftChange = (before: MasterCategory[], after: MasterCategory[]): AuditAction => {
  const beforeCategoryIds = before.map((category) => category.id);
  const afterCategoryIds = after.map((category) => category.id);
  const beforeDocumentIds = before.flatMap((category) => category.documents.map((document) => document.id));
  const afterDocumentIds = after.flatMap((category) => category.documents.map((document) => document.id));
  if (afterCategoryIds.some((id) => !beforeCategoryIds.includes(id)) || afterDocumentIds.some((id) => !beforeDocumentIds.includes(id))) return 'create';
  if (beforeCategoryIds.some((id) => !afterCategoryIds.includes(id)) || beforeDocumentIds.some((id) => !afterDocumentIds.includes(id))) return 'delete';
  if (JSON.stringify(beforeCategoryIds) !== JSON.stringify(afterCategoryIds)) return 'reorder';
  for (const category of after) {
    const previous = before.find((item) => item.id === category.id);
    if (previous && JSON.stringify(previous.documents.map((document) => document.id)) !== JSON.stringify(category.documents.map((document) => document.id))) return 'reorder';
  }
  return 'update';
};

export function createDocumentMastersRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = getDb().prepare(`
      SELECT code, label, version, draft_updated_at, published_at
      FROM document_masters ORDER BY sort_order, code
    `).all();
    res.json(rows);
  });

  router.get('/:code', (req, res) => {
    const row = getMaster(req.params.code);
    if (!row) {
      res.status(404).json({ error: '書類マスタが見つかりません' });
      return;
    }
    const mode = req.query.mode === 'published' ? 'published' : 'draft';
    const payload = mode === 'published' ? row.published_json : row.draft_json;
    const companyId = req.query.companyId === undefined ? null : Number(req.query.companyId);
    let categories = JSON.parse(payload) as MasterCategory[];
    if (Number.isInteger(companyId)) {
      categories = categories.map((category) => ({
        ...category,
        documents: category.documents.filter((document) => {
          const companyIds = document.companyIds ?? [];
          return companyIds.length === 0 || companyIds.includes(companyId!);
        }),
      })).filter((category) => category.documents.length > 0);
    }
    res.json({
      code: row.code,
      label: row.label,
      version: row.version,
      updatedAt: mode === 'published' ? row.published_at : row.draft_updated_at,
      categories,
    });
  });

  router.put('/:code/draft', (req, res) => {
    const row = getMaster(req.params.code);
    if (!row) {
      res.status(404).json({ error: '書類マスタが見つかりません' });
      return;
    }
    const categories = parseCategories(req.body.categories);
    if (!categories) {
      res.status(400).json({ error: 'カテゴリまたは書類の形式が不正です' });
      return;
    }
    const beforeCategories = JSON.parse(row.draft_json) as MasterCategory[];
    if (JSON.stringify(beforeCategories) === JSON.stringify(categories)) {
      res.json({ ok: true, unchanged: true });
      return;
    }
    const db = getDb();
    const save = db.transaction(() => {
      db.prepare(`
        UPDATE document_masters
        SET draft_json = ?, draft_updated_at = datetime('now')
        WHERE code = ?
      `).run(JSON.stringify(categories), row.code);
      writeAuditLog({
        targetType: 'document_master',
        targetId: row.code,
        targetName: row.label,
        action: classifyDraftChange(beforeCategories, categories),
        actor: actorFrom(req),
        before: masterSnapshot(row, beforeCategories),
        after: masterSnapshot(row, categories),
      });
    });
    save();
    res.json({ ok: true });
  });

  router.post('/:code/publish', (req, res) => {
    const db = getDb();
    const row = getMaster(req.params.code);
    if (!row) {
      res.status(404).json({ error: '書類マスタが見つかりません' });
      return;
    }
    const nextVersion = row.version + 1;
    const before = masterSnapshot(row, JSON.parse(row.published_json) as MasterCategory[]);
    const publishedCategories = JSON.parse(row.draft_json) as MasterCategory[];
    const publish = db.transaction(() => {
      db.prepare(`
        UPDATE document_masters
        SET published_json = draft_json, version = ?, published_at = datetime('now')
        WHERE code = ?
      `).run(nextVersion, row.code);
      db.prepare(`
        INSERT INTO document_master_versions (master_code, version, payload_json)
        VALUES (?, ?, ?)
      `).run(row.code, nextVersion, row.draft_json);
      writeAuditLog({
        targetType: 'document_master',
        targetId: row.code,
        targetName: row.label,
        action: 'publish',
        actor: actorFrom(req),
        before,
        after: { ...masterSnapshot(row, publishedCategories), version: nextVersion },
      });
    });
    publish();
    res.json({ ok: true, version: nextVersion });
  });

  router.get('/:code/versions', (req, res) => {
    if (!getMaster(req.params.code)) {
      res.status(404).json({ error: '書類マスタが見つかりません' });
      return;
    }
    const versions = getDb().prepare(`
      SELECT version, published_at FROM document_master_versions
      WHERE master_code = ? ORDER BY version DESC LIMIT 20
    `).all(req.params.code);
    res.json(versions);
  });

  router.post('/:code/restore/:version', (req, res) => {
    const row = getMaster(req.params.code);
    const version = Number(req.params.version);
    if (!row || !Number.isInteger(version)) {
      res.status(404).json({ error: '公開履歴が見つかりません' });
      return;
    }
    const history = getDb().prepare(`
      SELECT payload_json FROM document_master_versions
      WHERE master_code = ? AND version = ?
    `).get(row.code, version) as { payload_json: string } | undefined;
    if (!history) {
      res.status(404).json({ error: '公開履歴が見つかりません' });
      return;
    }
    const db = getDb();
    const beforeCategories = JSON.parse(row.draft_json) as MasterCategory[];
    const restoredCategories = JSON.parse(history.payload_json) as MasterCategory[];
    const restore = db.transaction(() => {
      db.prepare(`
        UPDATE document_masters SET draft_json = ?, draft_updated_at = datetime('now') WHERE code = ?
      `).run(history.payload_json, row.code);
      writeAuditLog({
        targetType: 'document_master',
        targetId: row.code,
        targetName: row.label,
        action: 'restore',
        actor: actorFrom(req),
        before: masterSnapshot(row, beforeCategories),
        after: { ...masterSnapshot(row, restoredCategories), restoredFromVersion: version },
      });
    });
    restore();
    res.json({ ok: true });
  });

  return router;
}
