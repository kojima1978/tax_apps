import { Router } from 'express';
import { getDb, writeAuditLog, type PoaDeceasedRow, type PoaPrincipalRow } from '../db.js';
import { parseBirthDate } from '../../src/utils/powerOfAttorney/wareki.js';
import { principalResponse } from './poaPrincipals.js';
import { actorFrom, auditMask, collator, deceasedLinksByPrincipal, heirsByDeceased, isRecord, normalizeForSearch } from './poaShared.js';

/**
 * 委任状の被相続人DB。相続人（委任者DB）とは多対多でつなぐ（poa_deceased_heirs）。
 * 委任者DBと同じく必須は氏名だけで、相続税案件管理とは同期しない。
 */

type DeceasedFields = Pick<PoaDeceasedRow, 'name' | 'name_kana' | 'birth_date' | 'memo'>;

const LIMITS = { name: 100, name_kana: 100, memo: 1000 } as const;
const LABELS: Record<keyof typeof LIMITS, string> = { name: '氏名', name_kana: 'フリガナ', memo: 'メモ' };

const parseFields = (body: unknown): { ok: true; value: DeceasedFields } | { ok: false; error: string } => {
  if (!isRecord(body)) return { ok: false, error: '入力が不正です' };
  const source: Record<keyof typeof LIMITS, unknown> = { name: body.name, name_kana: body.nameKana, memo: body.memo };
  const texts = {} as Record<keyof typeof LIMITS, string>;
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const value = source[key] ?? '';
    if (typeof value !== 'string') return { ok: false, error: `${LABELS[key]}が不正です` };
    const trimmed = value.trim();
    if (trimmed.length > LIMITS[key]) return { ok: false, error: `${LABELS[key]}は${LIMITS[key]}文字以内にしてください` };
    texts[key] = trimmed;
  }
  if (!texts.name) return { ok: false, error: '被相続人の氏名を入力してください' };

  const birthInput = body.birthDate ?? '';
  if (typeof birthInput !== 'string') return { ok: false, error: '生年月日が不正です' };
  const birth = parseBirthDate(birthInput);
  if (!birth.ok) return { ok: false, error: `生年月日: ${birth.error}` };
  return { ok: true, value: { ...texts, birth_date: birth.text } };
};

/** 相続人はゴミ箱の中の人を除いた委任者の形（委任状の画面がそのまま欄へ入れられるように） */
const responseOf = (row: PoaDeceasedRow, heirs: PoaPrincipalRow[] = []) => {
  const links = deceasedLinksByPrincipal(heirs.map((heir) => heir.id));
  return {
    id: row.id,
    name: row.name,
    nameKana: row.name_kana,
    birthDate: row.birth_date,
    memo: row.memo,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    heirs: heirs.map((heir) => principalResponse(heir, links.get(heir.id))),
  };
};

const withHeirs = (row: PoaDeceasedRow) => responseOf(row, heirsByDeceased([row.id]).get(row.id));

/** 操作履歴に残す形。生年月日は中身を書かない。相続人のつなぎ替えは名前の一覧で残す */
const auditSnapshot = (row: PoaDeceasedRow, previous?: PoaDeceasedRow) => ({
  name: row.name,
  nameKana: row.name_kana,
  memo: row.memo,
  birthDate: auditMask(row.birth_date, previous?.birth_date),
});

const heirNames = (deceasedId: number) => (heirsByDeceased([deceasedId]).get(deceasedId) ?? []).map((heir) => heir.name);

const sameFields = (row: PoaDeceasedRow, fields: DeceasedFields) =>
  (Object.keys(fields) as (keyof DeceasedFields)[]).every((key) => row[key] === fields[key]);

const sortKey = (row: PoaDeceasedRow) => row.name_kana || row.name;

const findRow = (id: string | number, deleted: boolean) =>
  getDb().prepare(`SELECT * FROM poa_deceased WHERE id = ? AND deleted_at IS ${deleted ? 'NOT NULL' : 'NULL'}`)
    .get(id) as PoaDeceasedRow | undefined;

const NOT_FOUND = '被相続人が見つかりません（削除された可能性があります）';

export function createPoaDeceasedRouter(): Router {
  const router = Router();

  // GET /?q=検索語&deleted=1（ゴミ箱）。検索は氏名・フリガナと、つながっている相続人の氏名に当たる
  router.get('/', (req, res) => {
    const deleted = req.query.deleted === '1';
    const rows = getDb().prepare(`SELECT * FROM poa_deceased WHERE deleted_at IS ${deleted ? 'NOT NULL' : 'NULL'}`)
      .all() as PoaDeceasedRow[];
    const heirs = heirsByDeceased(rows.map((row) => row.id));
    const query = typeof req.query.q === 'string' ? normalizeForSearch(req.query.q) : '';
    const filtered = query
      ? rows.filter((row) => [row.name, row.name_kana, ...(heirs.get(row.id) ?? []).map((heir) => heir.name)]
        .some((value) => normalizeForSearch(value).includes(query)))
      : rows;
    filtered.sort((a, b) => collator.compare(sortKey(a), sortKey(b)) || a.id - b.id);
    res.json(filtered.map((row) => responseOf(row, heirs.get(row.id))));
  });

  router.get('/:id', (req, res) => {
    const row = findRow(req.params.id, false);
    if (!row) { res.status(404).json({ error: NOT_FOUND }); return; }
    res.json(withHeirs(row));
  });

  router.post('/', (req, res) => {
    const parsed = parseFields(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const { value } = parsed;
    const db = getDb();
    const create = db.transaction(() => {
      const result = db.prepare('INSERT INTO poa_deceased (name, name_kana, birth_date, memo) VALUES (?, ?, ?, ?)')
        .run(value.name, value.name_kana, value.birth_date, value.memo);
      const created = db.prepare('SELECT * FROM poa_deceased WHERE id = ?').get(result.lastInsertRowid) as PoaDeceasedRow;
      writeAuditLog({ targetType: 'poa_deceased', targetId: created.id, targetName: created.name, action: 'create', actor: actorFrom(req), after: auditSnapshot(created) });
      return created;
    });
    res.status(201).json(responseOf(create()));
  });

  // PUT /:id（version で楽観ロック。ほかの画面で直されていたら 409）
  router.put('/:id', (req, res) => {
    const existing = findRow(req.params.id, false);
    if (!existing) { res.status(404).json({ error: NOT_FOUND }); return; }
    const version = isRecord(req.body) ? req.body.version : undefined;
    if (!Number.isInteger(version)) { res.status(400).json({ error: '版番号が必要です' }); return; }
    if (version !== existing.version) {
      res.status(409).json({ error: 'ほかの画面で被相続人の内容が変わりました。読み直してください', current: withHeirs(existing) });
      return;
    }
    const parsed = parseFields(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const { value } = parsed;
    if (sameFields(existing, value)) { res.json({ ...withHeirs(existing), unchanged: true }); return; }

    const db = getDb();
    const update = db.transaction(() => {
      db.prepare(`
        UPDATE poa_deceased SET name = ?, name_kana = ?, birth_date = ?, memo = ?, version = version + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(value.name, value.name_kana, value.birth_date, value.memo, existing.id);
      const updated = db.prepare('SELECT * FROM poa_deceased WHERE id = ?').get(existing.id) as PoaDeceasedRow;
      writeAuditLog({
        targetType: 'poa_deceased',
        targetId: updated.id,
        targetName: updated.name,
        action: 'update',
        actor: actorFrom(req),
        before: auditSnapshot(existing),
        after: auditSnapshot(updated, existing),
      });
      return updated;
    });
    res.json({ ...withHeirs(update()), unchanged: false });
  });

  // DELETE /:id はゴミ箱へ移すだけ。相続人とのつながりも残す（戻せばそのまま戻る）
  router.delete('/:id', (req, res) => {
    const existing = findRow(req.params.id, false);
    if (!existing) { res.status(404).json({ error: '被相続人が見つかりません' }); return; }
    const db = getDb();
    db.transaction(() => {
      db.prepare("UPDATE poa_deceased SET deleted_at = datetime('now'), version = version + 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
      writeAuditLog({ targetType: 'poa_deceased', targetId: existing.id, targetName: existing.name, action: 'delete', actor: actorFrom(req), before: auditSnapshot(existing) });
    })();
    res.json({ ok: true });
  });

  router.post('/:id/restore', (req, res) => {
    const existing = findRow(req.params.id, true);
    if (!existing) { res.status(404).json({ error: 'ゴミ箱に見つかりません' }); return; }
    const db = getDb();
    const restore = db.transaction(() => {
      db.prepare("UPDATE poa_deceased SET deleted_at = NULL, version = version + 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
      const restored = db.prepare('SELECT * FROM poa_deceased WHERE id = ?').get(existing.id) as PoaDeceasedRow;
      writeAuditLog({ targetType: 'poa_deceased', targetId: restored.id, targetName: restored.name, action: 'restore', actor: actorFrom(req), after: auditSnapshot(restored) });
      return restored;
    });
    res.json(withHeirs(restore()));
  });

  // POST /:id/heirs { principalIds }（相続人をつなぐ）。つながっている人は何もしない。
  // つなぎ替えは被相続人の中身を変えないので version は上げない（開いている編集画面を 409 にしないため）
  router.post('/:id/heirs', (req, res) => {
    const existing = findRow(req.params.id, false);
    if (!existing) { res.status(404).json({ error: NOT_FOUND }); return; }
    const ids = isRecord(req.body) ? req.body.principalIds : undefined;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(id))) {
      res.status(400).json({ error: 'つなぐ委任者を指定してください' });
      return;
    }
    const db = getDb();
    const principalIds = [...new Set(ids as number[])];
    const found = principalIds.filter((id) => db.prepare('SELECT 1 FROM poa_principals WHERE id = ? AND deleted_at IS NULL').get(id));
    if (found.length !== principalIds.length) {
      res.status(404).json({ error: '委任者が見つかりません（削除された可能性があります）' });
      return;
    }
    db.transaction(() => {
      const before = heirNames(existing.id);
      const insert = db.prepare('INSERT OR IGNORE INTO poa_deceased_heirs (deceased_id, principal_id) VALUES (?, ?)');
      const added = principalIds.reduce((count, id) => count + insert.run(existing.id, id).changes, 0);
      if (added > 0) {
        writeAuditLog({ targetType: 'poa_deceased', targetId: existing.id, targetName: existing.name, action: 'update', actor: actorFrom(req), before: { heirs: before }, after: { heirs: heirNames(existing.id) } });
      }
    })();
    res.json(withHeirs(existing));
  });

  // DELETE /:id/heirs/:principalId（つながりを外すだけ。委任者そのものは消さない）
  router.delete('/:id/heirs/:principalId', (req, res) => {
    const existing = findRow(req.params.id, false);
    if (!existing) { res.status(404).json({ error: NOT_FOUND }); return; }
    const db = getDb();
    db.transaction(() => {
      const before = heirNames(existing.id);
      const removed = db.prepare('DELETE FROM poa_deceased_heirs WHERE deceased_id = ? AND principal_id = ?').run(existing.id, req.params.principalId);
      if (removed.changes > 0) {
        writeAuditLog({ targetType: 'poa_deceased', targetId: existing.id, targetName: existing.name, action: 'update', actor: actorFrom(req), before: { heirs: before }, after: { heirs: heirNames(existing.id) } });
      }
    })();
    res.json(withHeirs(existing));
  });

  return router;
}
