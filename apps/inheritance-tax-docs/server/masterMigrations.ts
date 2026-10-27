import { getDb, writeAuditLog, type DocumentMasterRow } from './db.js';
import type { MasterCategory } from './masterDefaults.js';
import { POWER_OF_ATTORNEY_DOCUMENT, isPowerOfAttorneyDocument } from '../src/constants/documents.js';
import { normalizeForSearch } from './routes/poaShared.js';

/**
 * 稼働中の DB へ1回だけ流すデータの手直し。
 * - 書類マスタへ、あとから定数に足した書類を届ける（シードは空の DB にしか入らないので、
 *   定数を直しただけでは既存の PC に出てこない）
 * - 委任者の「被相続人」欄（手書きの手がかり）を被相続人DBへ写してつなぐ
 * 1回ごとに app_migrations へ印を残し、2回目は何もしない ── 利用者がマスタ管理で
 * 消した書類や、外したつながりを、起動し直すたびに戻さないため。
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
  addPowerOfAttorneyDocument();
  linkDeceasedFromPrincipals();
}

function addPowerOfAttorneyDocument(): void {
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

const DECEASED_MIGRATION = 'poa-deceased-from-principals';
const DECEASED_ACTOR = 'システム（委任者の被相続人欄から被相続人DBへ）';

/**
 * 被相続人DBを作る前は、委任者ごとに被相続人の名前を手で書いていた（deceased_name）。
 * 同じ名前（空白と全角半角の違いは無視）を1人の被相続人にまとめ、書いてあった委任者をつなぐ。
 * ゴミ箱の中の委任者もつなぐ（戻したときにつながりごと戻るように）。
 * 写し終えたら列を落とす ── 被相続人と委任者のつながりを2箇所で持つと、検索が両方に当たり
 * 片方だけ直せる形が残る。元の書き方は操作履歴（audit_logs）の after に残るので、
 * 同姓同名を別人として分けたいときの手がかりは失わない。
 * 列の有無がそのまま「移したか」の印なので、2回目は何もしない ── 利用者が外したつながりや
 * 消した被相続人を、起動し直すたびに戻さないため。
 */
function linkDeceasedFromPrincipals(): void {
  const db = getDb();
  const columns = db.prepare('PRAGMA table_info(poa_principals)').all() as { name: string }[];
  if (!columns.some((column) => column.name === 'deceased_name')) return;
  // 列を落とす前の版が付けた印。写すのは1回だけで、列は今回落とす
  const alreadyLinked = db.prepare('SELECT 1 FROM app_migrations WHERE name = ?').get(DECEASED_MIGRATION);

  const migrate = db.transaction(() => {
    if (!alreadyLinked) {
      const principals = db.prepare("SELECT id, name, deceased_name FROM poa_principals WHERE deceased_name <> '' ORDER BY id")
        .all() as { id: number; name: string; deceased_name: string }[];
      const groups = new Map<string, { name: string; principalIds: number[] }>();
      for (const principal of principals) {
        const key = normalizeForSearch(principal.deceased_name);
        if (!key) continue;
        const group = groups.get(key) ?? { name: principal.deceased_name.trim(), principalIds: [] };
        group.principalIds.push(principal.id);
        groups.set(key, group);
      }
      const insertDeceased = db.prepare('INSERT INTO poa_deceased (name) VALUES (?)');
      const link = db.prepare('INSERT OR IGNORE INTO poa_deceased_heirs (deceased_id, principal_id) VALUES (?, ?)');
      for (const group of groups.values()) {
        const deceasedId = Number(insertDeceased.run(group.name).lastInsertRowid);
        for (const principalId of group.principalIds) link.run(deceasedId, principalId);
        writeAuditLog({
          targetType: 'poa_deceased',
          targetId: deceasedId,
          targetName: group.name,
          action: 'create',
          actor: DECEASED_ACTOR,
          after: { name: group.name, heirs: principals.filter((p) => group.principalIds.includes(p.id)).map((p) => p.name) },
        });
      }
      db.prepare('INSERT INTO app_migrations (name) VALUES (?)').run(DECEASED_MIGRATION);
    }
    db.exec('ALTER TABLE poa_principals DROP COLUMN deceased_name');
  });
  migrate();
}
