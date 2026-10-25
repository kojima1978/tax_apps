import { getDb, type PoaPrincipalRow } from '../db.js';

/** 委任者DBと被相続人DBで共通の小物（同じものを2つの経路に持たせない） */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const decodeOperatorName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
};

export const actorFrom = (req: { header(name: string): string | undefined }): string | undefined =>
  decodeOperatorName(req.header('x-operator-name'));

// 検索は空白と全角半角の違いを無視する（「架空 花子」と「架空花子」を同じに）
export const normalizeForSearch = (value: string) => value.normalize('NFKC').replace(/\s/g, '').toLowerCase();

export const collator = new Intl.Collator('ja');

/**
 * 操作履歴に残す住所・生年月日の形。中身は書かず（履歴は誰でも開けて、消しても残るため）、
 * 入っているかどうかと、直したかどうかだけ分かるようにする。
 */
export const auditMask = (value: string, before: string | undefined) =>
  !value ? '' : before !== undefined && before !== value ? '入力あり（変更）' : '入力あり';

export type LinkedName = { id: number; name: string };

const placeholders = (ids: readonly number[]) => ids.map(() => '?').join(', ');

/** 委任者ごとの、つながっている被相続人（ゴミ箱の中の被相続人は出さない）。並びは名前のフリガナ順 */
export function deceasedLinksByPrincipal(principalIds: readonly number[]): Map<number, LinkedName[]> {
  const map = new Map<number, LinkedName[]>();
  if (principalIds.length === 0) return map;
  const rows = getDb().prepare(`
    SELECT h.principal_id, d.id, d.name, d.name_kana
    FROM poa_deceased_heirs h JOIN poa_deceased d ON d.id = h.deceased_id
    WHERE d.deleted_at IS NULL AND h.principal_id IN (${placeholders(principalIds)})
  `).all(...principalIds) as { principal_id: number; id: number; name: string; name_kana: string }[];
  rows.sort((a, b) => collator.compare(a.name_kana || a.name, b.name_kana || b.name) || a.id - b.id);
  for (const row of rows) {
    const list = map.get(row.principal_id) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.principal_id, list);
  }
  return map;
}

/** 被相続人ごとの、つながっている相続人（ゴミ箱の中の委任者は出さない）。並びはフリガナ順 */
export function heirsByDeceased(deceasedIds: readonly number[]): Map<number, PoaPrincipalRow[]> {
  const map = new Map<number, PoaPrincipalRow[]>();
  if (deceasedIds.length === 0) return map;
  const rows = getDb().prepare(`
    SELECT h.deceased_id AS link_deceased_id, p.*
    FROM poa_deceased_heirs h JOIN poa_principals p ON p.id = h.principal_id
    WHERE p.deleted_at IS NULL AND h.deceased_id IN (${placeholders(deceasedIds)})
  `).all(...deceasedIds) as (PoaPrincipalRow & { link_deceased_id: number })[];
  rows.sort((a, b) => collator.compare(a.name_kana || a.name, b.name_kana || b.name) || a.id - b.id);
  for (const { link_deceased_id: deceasedId, ...row } of rows) {
    const list = map.get(deceasedId) ?? [];
    list.push(row);
    map.set(deceasedId, list);
  }
  return map;
}
