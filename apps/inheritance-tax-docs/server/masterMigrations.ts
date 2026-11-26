import { getDb, writeAuditLog, type DocumentMasterRow, type PoaMatterMasterRow } from './db.js';
import { BANK_ACCOUNT_OPENING_MATTER, BANK_INCIDENTAL_MATTER, BANK_PROCEDURES_MATTER, BANK_STATEMENTS_MATTER, CARE_FACILITY_MATTER, DEFAULT_MATTER_MASTER, type Matter, type MatterMaster } from '../src/constants/powerOfAttorneyMatters.js';
import { auditSnapshot } from './routes/poaMatters.js';
import type { MasterCategory } from './masterDefaults.js';
import {
  ETAX_USER_ID_DOCUMENT,
  POWER_OF_ATTORNEY_DOCUMENT,
  isEtaxUserIdDocument,
  isPowerOfAttorneyDocument,
} from '../src/constants/documents.js';
import { normalizeForSearch } from './routes/poaShared.js';

/**
 * 稼働中の DB へ1回だけ流すデータの手直し。
 * - 書類マスタへ、あとから定数に足した書類を届ける（シードは空の DB にしか入らないので、
 *   定数を直しただけでは既存の PC に出てこない）
 * - 委任者の「被相続人」欄（手書きの手がかり）を被相続人DBへ写してつなぐ
 * 1回ごとに app_migrations へ印を残し、2回目は何もしない ── 利用者がマスタ管理で
 * 消した書類や、外したつながりを、起動し直すたびに戻さないため。
 */

const INHERITANCE_TAX_MASTER_CODE = 'inheritance-tax';
const IDENTITY_CATEGORY_ID = 'identity';

/**
 * 相続税の書類マスタを1回だけ手直しする。下書きと公開版の両方へ transform を当て、
 * 公開版が変わったら版を上げて document_master_versions と操作履歴に残す（マスタ管理の「公開」と同じ形）。
 * transform は変えるものが無ければ null を返す。
 */
function migrateInheritanceTaxMaster(
  name: string,
  actor: string,
  transform: (categories: MasterCategory[]) => MasterCategory[] | null,
): void {
  const db = getDb();
  if (db.prepare('SELECT 1 FROM app_migrations WHERE name = ?').get(name)) return;

  const migrate = db.transaction(() => {
    const row = db.prepare('SELECT * FROM document_masters WHERE code = ?').get(INHERITANCE_TAX_MASTER_CODE) as DocumentMasterRow | undefined;
    if (row) {
      const published = JSON.parse(row.published_json) as MasterCategory[];
      const nextDraft = transform(JSON.parse(row.draft_json) as MasterCategory[]);
      const nextPublished = transform(published);
      if (nextDraft) {
        db.prepare(`
          UPDATE document_masters SET draft_json = ?, draft_updated_at = datetime('now') WHERE code = ?
        `).run(JSON.stringify(nextDraft), row.code);
      }
      if (nextPublished) {
        // 画面は公開版しか読まないので、公開版は版を上げて履歴にも残す
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
          actor,
          before: { code: row.code, label: row.label, version: row.version, categories: published },
          after: { code: row.code, label: row.label, version: nextVersion, categories: nextPublished },
        });
      }
    }
    db.prepare('INSERT INTO app_migrations (name) VALUES (?)').run(name);
  });
  migrate();
}

/** 委任状が無ければ「マイナンバー・印鑑証明書」の末尾（無ければ先頭の区分）へ足す。足さなければ null */
export const withPowerOfAttorney = (categories: MasterCategory[]): MasterCategory[] | null => {
  if (categories.length === 0) return null;
  if (categories.some((category) => category.documents.some(isPowerOfAttorneyDocument))) return null;
  const target = categories.find((category) => category.id === IDENTITY_CATEGORY_ID) ?? categories[0];
  return categories.map((category) => category === target
    ? { ...category, documents: [...category.documents, { ...POWER_OF_ATTORNEY_DOCUMENT, canDelegate: false }] }
    : category);
};

/**
 * 利用者識別番号が無ければ「マイナンバー・印鑑証明書」へ足す。位置は印鑑証明書の直後、
 * 無ければ委任状の前、それも無ければ区分の末尾（区分が無ければ先頭の区分）。
 * 利用者がマスタ管理で並べ替えていても、その並びは崩さず1行差し込むだけ。足さなければ null
 */
export const withEtaxUserId = (categories: MasterCategory[]): MasterCategory[] | null => {
  if (categories.length === 0) return null;
  if (categories.some((category) => category.documents.some(isEtaxUserIdDocument))) return null;
  const target = categories.find((category) => category.id === IDENTITY_CATEGORY_ID) ?? categories[0];
  const documents = [...target.documents];
  const afterInkan = documents.findIndex((doc) => doc.id === 'heir_inkan');
  const beforePoa = documents.findIndex(isPowerOfAttorneyDocument);
  const at = afterInkan >= 0 ? afterInkan + 1 : beforePoa >= 0 ? beforePoa : documents.length;
  documents.splice(at, 0, { ...ETAX_USER_ID_DOCUMENT, canDelegate: false });
  return categories.map((category) => category === target ? { ...category, documents } : category);
};

export function runMasterMigrations(): void {
  migrateInheritanceTaxMaster('add-power-of-attorney-document', 'システム（委任状を書類リストへ追加）', withPowerOfAttorney);
  migrateInheritanceTaxMaster(
    'remove-deceased-resident-record-document',
    'システム（亡くなった方の住民票の除票を必要書類から削除）',
    withoutDeceasedResidentRecord,
  );
  migrateInheritanceTaxMaster('add-etax-user-id-document', 'システム（利用者識別番号を書類リストへ追加）', withEtaxUserId);
  linkDeceasedFromPrincipals();
  migratePoaMatterMaster(
    'update-poa-bank-procedures-default',
    'システム（金融機関の委任事項の初期文言を更新）',
    'update',
    (before) => replacePoaDefaultText(before, BANK_PROCEDURES_MATTER, LEGACY_BANK_PROCEDURES_TEXT),
  );
  migratePoaMatterMaster(
    'update-poa-care-facility-default',
    'システム（施設の委任事項の初期文言を更新）',
    'update',
    (before) => replacePoaDefaultText(before, CARE_FACILITY_MATTER, LEGACY_CARE_FACILITY_TEXT),
  );
  migratePoaMatterMaster(
    'add-poa-bank-additional-matters',
    'システム（金融機関の委任事項を追加）',
    'create',
    withAdditionalBankMatters,
  );
  migratePoaMatterMaster(
    'move-poa-bank-incidental-matter-to-end',
    'システム（付帯事項を相続手続き用の末尾へ移動）',
    'reorder',
    withIncidentalMatterLast,
  );
  migratePoaMatterMaster(
    'revise-inheritance-poa-default-wording',
    'システム（相続手続き用の委任事項の初期文言を更新）',
    'update',
    withRevisedInheritanceMatterText,
  );
  migratePoaMatterMaster(
    'clarify-poa-bank-statement-types',
    'システム（取引明細書の種類を追記）',
    'update',
    (before) => replacePoaDefaultText(before, BANK_STATEMENTS_MATTER, PREVIOUS_BANK_STATEMENTS_TEXT),
  );
}

const PREVIOUS_BANK_STATEMENTS_TEXT = '被相続人名義の全取引に係る残高証明書、利息計算書、取引明細書等の発行請求及び受領に関する一切の権限';

const PREVIOUS_INHERITANCE_MATTER_TEXT: Readonly<Record<string, string>> = {
  'bank-statements': '被相続人名義の全取引に係る残高証明書、利息計算書、取引明細書等の発行請求および当該書類の受領に関する一切の権限',
  'bank-procedures': '被相続人名義の預貯金・有価証券等の一切の取引に係る相続手続き（相続届・相続手続依頼書その他関係書類の作成・記入、提出および受領、口座の解約ならびに払戻金等の請求および受領を含む）に関する一切の権限',
  'bank-account-opening': '相続手続きに伴う新規口座の開設申込書その他関係書類の作成・記入、提出および受領に関する一切の権限',
  'deceased-koseki': '被相続人の出生から死亡にいたるまでの戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本並びにその附票の交付申請並びに受領に関する一切の権限',
  'heir-koseki': '相続人及び受遺者の戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本並びに相続人を確認するために必要となる戸籍謄本、除籍謄本、改製原戸籍謄本及び再製原戸籍謄本の交付申請並びに受領に関する一切の権限',
  'resident-records': '被相続人及び相続人及び受遺者の住民票の写し、除票の写し及び戸籍の（除）附票の交付申請並びに受領に関する一切の権限',
  'property-certificates': '被相続人所有（共有名義のものを含む）の不動産の評価証明書・名寄帳・課税証明書・無資産証明書の交付申請並びに受領に関する一切の権限',
  'care-facility': '被相続人の相続税申告および関連手続きに伴い、被相続人が入居・入所していた施設が保管する入所契約書の写し、介護保険被保険者証の写しその他関係書類の交付請求および受領に関する一切の権限',
  'bank-incidental-matters': 'その他、上記各号の相続手続きに係る一切の権限およびこれらに付帯する一切の事項',
};

function withRevisedInheritanceMatterText(before: MatterMaster): MatterMaster | null {
  const currentDefaults = new Map(DEFAULT_MATTER_MASTER.matters.inheritance.map(({ id, text }) => [id, text]));
  let changed = false;
  const inheritance = before.matters.inheritance.map((matter) => {
    const revised = currentDefaults.get(matter.id);
    if (!revised || revised === matter.text || matter.text !== PREVIOUS_INHERITANCE_MATTER_TEXT[matter.id]) return matter;
    changed = true;
    return { ...matter, text: revised };
  });
  return changed ? { ...before, matters: { ...before.matters, inheritance } } : null;
}

const LEGACY_BANK_PROCEDURES_TEXT = '被相続人名義の全取引に関する相続手続きに関し、関係書類へ記入および、解約、手続きに関するすべての権限';
const LEGACY_CARE_FACILITY_TEXT = '被相続人の相続税申告および関連手続きに伴い、被相続人が入居・入所していた施設が保管する「施設入所時における契約書の写し」および「介護保険被保険者証の写し」の交付請求ならびに受領に関する一切の件';

/** 旧初期文言が残る項目だけを更新し、マスタ管理で編集・削除した内容を保つ。 */
function replacePoaDefaultText(before: MatterMaster, replacement: Matter, oldText: string): MatterMaster | null {
  const oldMatter = before.matters.inheritance.find((matter) =>
    matter.id === replacement.id && matter.text === oldText);
  if (!oldMatter) return null;
  return {
    ...before,
    matters: {
      ...before.matters,
      inheritance: before.matters.inheritance.map((matter) =>
        matter === oldMatter ? { ...matter, text: replacement.text } : matter),
    },
  };
}

function withAdditionalBankMatters(before: MatterMaster): MatterMaster | null {
  const inherited = before.matters.inheritance;
  const additions = [BANK_ACCOUNT_OPENING_MATTER, BANK_INCIDENTAL_MATTER].filter((item) =>
    !inherited.some((matter) => matter.id === item.id || matter.text === item.text));
  if (additions.length === 0) return null;

  const bankIds = new Set([...before.presets.bank, ...additions.map(({ id }) => id)]);
  const inheritance = [...inherited];
  const lastBankIndex = inherited.map(({ id }) =>
    id === BANK_PROCEDURES_MATTER.id || bankIds.has(id)).lastIndexOf(true);
  inheritance.splice(lastBankIndex < 0 ? inheritance.length : lastBankIndex + 1, 0, ...additions);
  const after = {
    matters: { ...before.matters, inheritance },
    presets: { ...before.presets, bank: inheritance.filter(({ id }) => bankIds.has(id)).map(({ id }) => id) },
  };
  return withIncidentalMatterLast(after) ?? after;
}

function withIncidentalMatterLast(before: MatterMaster): MatterMaster | null {
  const inheritance = before.matters.inheritance;
  const index = inheritance.findIndex(({ id }) => id === BANK_INCIDENTAL_MATTER.id);
  if (index < 0 || index === inheritance.length - 1) return null;

  const reordered = [...inheritance];
  const [incidental] = reordered.splice(index, 1);
  reordered.push(incidental);
  const bank = before.presets.bank;
  return {
    matters: { ...before.matters, inheritance: reordered },
    presets: {
      ...before.presets,
      bank: bank.includes(incidental.id) ? [...bank.filter((id) => id !== incidental.id), incidental.id] : bank,
    },
  };
}

function migratePoaMatterMaster(
  name: string,
  actor: string,
  action: 'create' | 'update' | 'reorder',
  transform: (before: MatterMaster) => MatterMaster | null,
): void {
  const db = getDb();
  db.transaction(() => {
    if (db.prepare('SELECT 1 FROM app_migrations WHERE name = ?').get(name)) return;
    const row = db.prepare('SELECT * FROM poa_matter_master WHERE id = 1').get() as PoaMatterMasterRow | undefined;
    if (!row) return;

    const before = JSON.parse(row.payload_json) as MatterMaster;
    const after = transform(before);
    if (after) {
      db.prepare(`
        UPDATE poa_matter_master SET payload_json = ?, version = version + 1, updated_at = datetime('now')
        WHERE id = 1
      `).run(JSON.stringify(after));
      writeAuditLog({
        targetType: 'poa_matter',
        targetId: row.id,
        targetName: '委任事項',
        action,
        actor,
        before: auditSnapshot(before),
        after: auditSnapshot(after),
      });
    }
    db.prepare('INSERT INTO app_migrations (name) VALUES (?)').run(name);
  }).immediate();
}

const DECEASED_RESIDENT_RECORD_ID = 'deceased_jyuminhyo';

/** 亡くなった方の住民票の除票を必要書類から外す。無ければ null */
export const withoutDeceasedResidentRecord = (categories: MasterCategory[]): MasterCategory[] | null => {
  let changed = false;
  const next = categories.map((category) => {
    const documents = category.documents.filter((document) => document.id !== DECEASED_RESIDENT_RECORD_ID);
    if (documents.length === category.documents.length) return category;
    changed = true;
    return { ...category, documents };
  });
  return changed ? next : null;
};

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
