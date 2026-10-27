import { Router } from 'express';
import { getDb, writeAuditLog, type PoaPrincipalRow } from '../db.js';
import { parseBirthDate } from '../../src/utils/powerOfAttorney/wareki.js';
import { actorFrom, auditMask, collator, deceasedLinksByPrincipal, isRecord, normalizeForSearch, type LinkedName } from './poaShared.js';

/**
 * 委任状の委任者DB。委任状を気軽に作れることを優先し、必須は氏名（法人名）だけ。
 * 相続税案件管理の相続人とは同期しない ── あちらの厳格な運用に委任状の作成を縛らせないため。
 */

type PrincipalFields = Omit<PoaPrincipalRow, 'id' | 'version' | 'created_at' | 'updated_at' | 'deleted_at'>;

const LIMITS: Record<Exclude<keyof PrincipalFields, 'kind' | 'birth_date'>, number> = {
  name: 100,
  name_kana: 100,
  address: 300,
  representative: 100,
  memo: 1000,
};

const LABELS: Record<keyof typeof LIMITS, string> = {
  name: '氏名',
  name_kana: 'フリガナ',
  address: '住所',
  representative: '代表者',
  memo: 'メモ',
};

const isKind = (value: unknown): value is PrincipalFields['kind'] => value === 'individual' || value === 'corporate';

/** 画面の項目名（camelCase）から列へ。法人に生年月日、個人に代表者は持たせない */
const parseFields = (body: unknown): { ok: true; value: PrincipalFields } | { ok: false; error: string } => {
  if (!isRecord(body)) return { ok: false, error: '入力が不正です' };
  const kind = body.kind ?? 'individual';
  if (!isKind(kind)) return { ok: false, error: '区分が不正です' };

  const source: Record<keyof typeof LIMITS, unknown> = {
    name: body.name,
    name_kana: body.nameKana,
    address: body.address,
    representative: body.representative,
    memo: body.memo,
  };
  const texts = {} as Record<keyof typeof LIMITS, string>;
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const value = source[key] ?? '';
    if (typeof value !== 'string') return { ok: false, error: `${LABELS[key]}が不正です` };
    const trimmed = value.trim();
    if (trimmed.length > LIMITS[key]) return { ok: false, error: `${LABELS[key]}は${LIMITS[key]}文字以内にしてください` };
    texts[key] = trimmed;
  }
  if (!texts.name) return { ok: false, error: kind === 'corporate' ? '法人名を入力してください' : '氏名を入力してください' };

  const birthInput = body.birthDate ?? '';
  if (typeof birthInput !== 'string') return { ok: false, error: '生年月日が不正です' };
  const birth = kind === 'individual' ? parseBirthDate(birthInput) : { ok: true as const, text: '' };
  if (!birth.ok) return { ok: false, error: `生年月日: ${birth.error}` };

  return {
    ok: true,
    value: {
      kind,
      ...texts,
      representative: kind === 'corporate' ? texts.representative : '',
      birth_date: birth.text,
    },
  };
};

/** 画面へ返す形。deceased はつながっている被相続人（被相続人DB） */
export const principalResponse = (row: PoaPrincipalRow, deceased: LinkedName[] = []) => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  nameKana: row.name_kana,
  address: row.address,
  birthDate: row.birth_date,
  representative: row.representative,
  deceased,
  memo: row.memo,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

/** 操作履歴に残す形。住所と生年月日は中身を書かない（auditMask） */
const auditSnapshot = (row: PoaPrincipalRow, previous?: PoaPrincipalRow) => ({
  kind: row.kind,
  name: row.name,
  nameKana: row.name_kana,
  representative: row.representative,
  memo: row.memo,
  address: auditMask(row.address, previous?.address),
  birthDate: auditMask(row.birth_date, previous?.birth_date),
});

const sameFields = (row: PoaPrincipalRow, fields: PrincipalFields) =>
  (Object.keys(fields) as (keyof PrincipalFields)[]).every((key) => row[key] === fields[key]);

const sortKey = (row: PoaPrincipalRow) => row.name_kana || row.name;

const withLinks = (row: PoaPrincipalRow) => principalResponse(row, deceasedLinksByPrincipal([row.id]).get(row.id));

const findRow = (id: string, deleted: boolean) =>
  getDb().prepare(`SELECT * FROM poa_principals WHERE id = ? AND deleted_at IS ${deleted ? 'NOT NULL' : 'NULL'}`)
    .get(id) as PoaPrincipalRow | undefined;

export function createPoaPrincipalsRouter(): Router {
  const router = Router();

  // GET /?q=検索語&deleted=1（ゴミ箱）。並びはフリガナ（無ければ氏名）順。
  // 検索はつながっている被相続人の名前にも当たる（「架空一郎さんの相続人」で引けるように）
  router.get('/', (req, res) => {
    const deleted = req.query.deleted === '1';
    const rows = getDb().prepare(`SELECT * FROM poa_principals WHERE deleted_at IS ${deleted ? 'NOT NULL' : 'NULL'}`)
      .all() as PoaPrincipalRow[];
    const links = deceasedLinksByPrincipal(rows.map((row) => row.id));
    const query = typeof req.query.q === 'string' ? normalizeForSearch(req.query.q) : '';
    const filtered = query
      ? rows.filter((row) => [row.name, row.name_kana, ...(links.get(row.id) ?? []).map((d) => d.name)]
        .some((value) => normalizeForSearch(value).includes(query)))
      : rows;
    filtered.sort((a, b) => collator.compare(sortKey(a), sortKey(b)) || a.id - b.id);
    res.json(filtered.map((row) => principalResponse(row, links.get(row.id))));
  });

  // GET /:id（委任者DBの画面の「委任状を作る」から1人だけ引く。ゴミ箱の中は返さない）
  router.get('/:id', (req, res) => {
    const row = findRow(req.params.id, false);
    if (!row) { res.status(404).json({ error: '委任者が見つかりません（削除された可能性があります）' }); return; }
    res.json(withLinks(row));
  });

  router.post('/', (req, res) => {
    const parsed = parseFields(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const { value } = parsed;
    const db = getDb();
    const create = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO poa_principals (kind, name, name_kana, address, birth_date, representative, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(value.kind, value.name, value.name_kana, value.address, value.birth_date, value.representative, value.memo);
      const created = db.prepare('SELECT * FROM poa_principals WHERE id = ?').get(result.lastInsertRowid) as PoaPrincipalRow;
      writeAuditLog({ targetType: 'poa_principal', targetId: created.id, targetName: created.name, action: 'create', actor: actorFrom(req), after: auditSnapshot(created) });
      return created;
    });
    res.status(201).json(principalResponse(create()));
  });

  // PUT /:id（version で楽観ロック。ほかの画面で直されていたら 409）
  router.put('/:id', (req, res) => {
    const existing = findRow(req.params.id, false);
    if (!existing) { res.status(404).json({ error: '委任者が見つかりません（削除された可能性があります）' }); return; }
    const version = isRecord(req.body) ? req.body.version : undefined;
    if (!Number.isInteger(version)) { res.status(400).json({ error: '版番号が必要です' }); return; }
    if (version !== existing.version) {
      res.status(409).json({ error: 'ほかの画面で委任者の内容が変わりました。読み直してください', current: withLinks(existing) });
      return;
    }
    const parsed = parseFields(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const { value } = parsed;
    if (sameFields(existing, value)) { res.json({ ...withLinks(existing), unchanged: true }); return; }

    const db = getDb();
    const update = db.transaction(() => {
      db.prepare(`
        UPDATE poa_principals
        SET kind = ?, name = ?, name_kana = ?, address = ?, birth_date = ?, representative = ?, memo = ?,
            version = version + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(value.kind, value.name, value.name_kana, value.address, value.birth_date, value.representative, value.memo, existing.id);
      const updated = db.prepare('SELECT * FROM poa_principals WHERE id = ?').get(existing.id) as PoaPrincipalRow;
      writeAuditLog({
        targetType: 'poa_principal',
        targetId: updated.id,
        targetName: updated.name,
        action: 'update',
        actor: actorFrom(req),
        before: auditSnapshot(existing),
        after: auditSnapshot(updated, existing),
      });
      return updated;
    });
    res.json({ ...withLinks(update()), unchanged: false });
  });

  // DELETE /:id はゴミ箱へ移すだけ（POST /:id/restore で戻せる）
  router.delete('/:id', (req, res) => {
    const existing = findRow(req.params.id, false);
    if (!existing) { res.status(404).json({ error: '委任者が見つかりません' }); return; }
    const db = getDb();
    db.transaction(() => {
      db.prepare("UPDATE poa_principals SET deleted_at = datetime('now'), version = version + 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
      writeAuditLog({ targetType: 'poa_principal', targetId: existing.id, targetName: existing.name, action: 'delete', actor: actorFrom(req), before: auditSnapshot(existing) });
    })();
    res.json({ ok: true });
  });

  router.post('/:id/restore', (req, res) => {
    const existing = findRow(req.params.id, true);
    if (!existing) { res.status(404).json({ error: 'ゴミ箱に見つかりません' }); return; }
    const db = getDb();
    const restore = db.transaction(() => {
      db.prepare("UPDATE poa_principals SET deleted_at = NULL, version = version + 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
      const restored = db.prepare('SELECT * FROM poa_principals WHERE id = ?').get(existing.id) as PoaPrincipalRow;
      writeAuditLog({ targetType: 'poa_principal', targetId: restored.id, targetName: restored.name, action: 'restore', actor: actorFrom(req), after: auditSnapshot(restored) });
      return restored;
    });
    res.json(withLinks(restore()));
  });

  return router;
}
