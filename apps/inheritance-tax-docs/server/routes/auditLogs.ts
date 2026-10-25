import { Router } from 'express';
import { getDb, writeAuditLog, type AuditTargetType, type ResourceRow } from '../db.js';

const decodeOperatorName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
};

type AuditLogRow = {
  id: number;
  target_type: AuditTargetType;
  target_id: string;
  target_name: string;
  action: 'create' | 'update' | 'delete' | 'reorder' | 'publish' | 'restore';
  actor: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
};

const toResponse = (row: AuditLogRow) => ({
  id: row.id,
  targetType: row.target_type,
  targetId: row.target_id,
  targetName: row.target_name,
  action: row.action,
  actor: row.actor,
  before: row.before_json ? JSON.parse(row.before_json) : null,
  after: row.after_json ? JSON.parse(row.after_json) : null,
  createdAt: row.created_at,
});

export function createAuditLogsRouter(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const targetType = req.query.targetType;
    const action = req.query.action;
    const clauses: string[] = [];
    const params: string[] = [];

    if (targetType === 'document_master' || targetType === 'resource' || targetType === 'poa_matter' || targetType === 'poa_principal') {
      clauses.push('target_type = ?');
      params.push(targetType);
    }
    if (typeof action === 'string' && ['create', 'update', 'delete', 'reorder', 'publish', 'restore'].includes(action)) {
      clauses.push('action = ?');
      params.push(action);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = getDb().prepare(`
      SELECT * FROM audit_logs ${where}
      ORDER BY created_at DESC, id DESC LIMIT 500
    `).all(...params) as AuditLogRow[];
    res.json(rows.map(toResponse));
  });

  router.get('/:id', (req, res) => {
    const row = getDb().prepare('SELECT * FROM audit_logs WHERE id = ?').get(req.params.id) as AuditLogRow | undefined;
    if (!row) {
      res.status(404).json({ error: '操作履歴が見つかりません' });
      return;
    }
    res.json(toResponse(row));
  });

  // Deleted reference materials can be re-enabled without touching the retained file.
  // Other restoration flows remain on the versioned document-master endpoint.
  router.post('/:id/restore', (req, res) => {
    const db = getDb();
    const log = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(req.params.id) as AuditLogRow | undefined;
    if (!log || log.target_type !== 'resource' || log.action !== 'delete' || !log.before_json) {
      res.status(400).json({ error: 'この履歴は復元できません' });
      return;
    }

    const current = db.prepare('SELECT * FROM resources WHERE id = ?').get(log.target_id) as ResourceRow | undefined;
    if (!current) {
      res.status(404).json({ error: '復元対象の参考資料が見つかりません' });
      return;
    }
    if (!current.deleted_at) {
      res.status(409).json({ error: 'この参考資料はすでに有効です' });
      return;
    }

    const latest = db.prepare(`
      SELECT id, action FROM audit_logs
      WHERE target_type = 'resource' AND target_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(log.target_id) as Pick<AuditLogRow, 'id' | 'action'> | undefined;
    if (!latest || latest.id !== log.id || latest.action !== 'delete') {
      res.status(409).json({ error: '最新の削除履歴から復元してください' });
      return;
    }

    const before = JSON.parse(log.before_json) as ResourceRow;
    const actor = decodeOperatorName(req.header('x-operator-name'));
    const restore = db.transaction(() => {
      db.prepare(`
        UPDATE resources
        SET title = ?, description = ?, filename = ?, url = ?, sort_order = ?, company_ids_json = ?,
            deleted_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(before.title, before.description, before.filename, before.url, before.sort_order, before.company_ids_json ?? '[]', current.id);
      const restored = db.prepare('SELECT * FROM resources WHERE id = ?').get(current.id) as ResourceRow;
      writeAuditLog({
        targetType: 'resource',
        targetId: restored.id,
        targetName: restored.title,
        action: 'restore',
        actor,
        before: current,
        after: restored,
      });
      return restored;
    });

    res.json(restore());
  });

  return router;
}
