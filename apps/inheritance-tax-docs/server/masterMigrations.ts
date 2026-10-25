import { getDb, writeAuditLog, type DocumentMasterRow } from './db.js';
import type { MasterCategory } from './masterDefaults.js';
import { POWER_OF_ATTORNEY_DOCUMENT, isPowerOfAttorneyDocument } from '../src/constants/documents.js';

/**
 * 稼働中の DB の書類マスタへ、あとから定数に足した書類を届ける。
 * シードは空の DB にしか入らないので、定数を直しただけでは既存の PC に出てこない。
 * 1回ごとに app_migrations へ印を残し、2回目は何もしない ── 利用者がマスタ管理で
 * 消した書類を、起動し直すたびに足し戻さないため。
 */

const POA_MIGRATION = 'add-power-of-attorney-document';
const POA_MASTER_CODE = 'inheritance-tax';
const POA_CATEGORY_ID = 'identity';
const ACTOR = 'システム（委任状を書類リストへ追加）';

/** 委任状が無ければ「マイナンバー・印鑑証明書」の末尾（無ければ先頭の区分）へ足す。足さなければ null */
export const withPowerOfAttorney = (categories: MasterCategory[]): MasterCategory[] | null => {
  if (categories.length === 0) return null;
  if (categories.some((category) => category.documents.some(isPowerOfAttorneyDocument))) return null;
  const target = categories.find((category) => category.id === POA_CATEGORY_ID) ?? categories[0];
  return categories.map((category) => category === target
    ? { ...category, documents: [...category.documents, { ...POWER_OF_ATTORNEY_DOCUMENT, canDelegate: false }] }
    : category);
};

export function runMasterMigrations(): void {
  const db = getDb();
  if (db.prepare('SELECT 1 FROM app_migrations WHERE name = ?').get(POA_MIGRATION)) return;

  const migrate = db.transaction(() => {
    const row = db.prepare('SELECT * FROM document_masters WHERE code = ?').get(POA_MASTER_CODE) as DocumentMasterRow | undefined;
    if (row) {
      const published = JSON.parse(row.published_json) as MasterCategory[];
      const nextDraft = withPowerOfAttorney(JSON.parse(row.draft_json) as MasterCategory[]);
      const nextPublished = withPowerOfAttorney(published);
      if (nextDraft) {
        db.prepare(`
          UPDATE document_masters SET draft_json = ?, draft_updated_at = datetime('now') WHERE code = ?
        `).run(JSON.stringify(nextDraft), row.code);
      }
      if (nextPublished) {
        // 画面は公開版しか読まないので、公開版は版を上げて履歴にも残す（マスタ管理の「公開」と同じ形）
        const nextVersion = row.version + 1;
        const payload = JSON.stringify(nextPublished);
        db.prepare(`
          UPDATE document_masters SET published_json = ?, version = ?, published_at = datetime('now') WHERE code = ?
        `).run(payload, nextVersion, row.code);
        db.prepare(`
          INSERT INTO document_master_versions (master_code, version, payload_json) VALUES (?, ?, ?)
        `).run(row.code, nextVersion, payload);
        writeAuditLog({
          targetType: 'document_master',
          targetId: row.code,
          targetName: row.label,
          action: 'publish',
          actor: ACTOR,
          before: { code: row.code, label: row.label, version: row.version, categories: published },
          after: { code: row.code, label: row.label, version: nextVersion, categories: nextPublished },
        });
      }
    }
    db.prepare('INSERT INTO app_migrations (name) VALUES (?)').run(POA_MIGRATION);
  });
  migrate();
}
