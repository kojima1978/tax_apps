import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH ?? path.resolve('data', 'resources.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  initSchema(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// health 用: DB を開いて読めることに加え、DB ファイルとそのフォルダに書けるかを見る
// （DB には何も書かない）。SELECT 1 だけでは「ファイルだけ書けない」状態を
// 見落とす ── 開くのも読むのも書き込みロックも通り、実際に書いたときに初めて
// SQLITE_READONLY になる（実測）。リストアで所有者がずれた 2026-10-14 の件では
// フォルダごと書けず、healthcheck は通ったまま DB だけ開けなかった。
// 戻り値: 問題が無ければ null、あればエラーコード。
export function checkDbHealth(): string | null {
  try {
    getDb().prepare('SELECT 1').get();
    fs.accessSync(DB_PATH, fs.constants.W_OK);
    fs.accessSync(path.dirname(DB_PATH), fs.constants.W_OK);
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'error';
  }
}

function initSchema(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      filename   TEXT,
      url        TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS document_masters (
      code             TEXT PRIMARY KEY,
      label            TEXT NOT NULL,
      draft_json       TEXT NOT NULL,
      published_json   TEXT NOT NULL,
      version           INTEGER NOT NULL DEFAULT 1,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      draft_updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      published_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS document_master_versions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      master_code   TEXT NOT NULL REFERENCES document_masters(code),
      version       INTEGER NOT NULL,
      payload_json  TEXT NOT NULL,
      published_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(master_code, version)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type  TEXT NOT NULL,
      target_id    TEXT NOT NULL,
      target_name  TEXT NOT NULL,
      action       TEXT NOT NULL,
      actor        TEXT NOT NULL DEFAULT 'ローカル利用者',
      before_json  TEXT,
      after_json   TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, id DESC);
    -- 委任状の委任事項マスタ。全社共通の1行だけ（id = 1）。version は楽観ロック用
    CREATE TABLE IF NOT EXISTS poa_matter_master (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      payload_json TEXT NOT NULL,
      version      INTEGER NOT NULL DEFAULT 1,
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- 委任状の委任者。相続税案件管理とは同期しない（あちらの厳格な運用に委任状の作成を縛らせない）。
    -- birth_date は和暦に直した文字列（空なら手書き欄）。deleted_at はゴミ箱
    CREATE TABLE IF NOT EXISTS poa_principals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      kind           TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual', 'corporate')),
      name           TEXT NOT NULL,
      name_kana      TEXT NOT NULL DEFAULT '',
      address        TEXT NOT NULL DEFAULT '',
      birth_date     TEXT NOT NULL DEFAULT '',
      representative TEXT NOT NULL DEFAULT '',
      deceased_name  TEXT NOT NULL DEFAULT '',
      memo           TEXT NOT NULL DEFAULT '',
      version        INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at     TEXT
    );
  `);

  // Existing databases predate soft deletion. Keep the migration additive so
  // production data is never rebuilt or discarded.
  const resourceColumns = d.prepare('PRAGMA table_info(resources)').all() as { name: string }[];
  if (!resourceColumns.some((column) => column.name === 'deleted_at')) {
    d.exec('ALTER TABLE resources ADD COLUMN deleted_at TEXT');
  }
  if (!resourceColumns.some((column) => column.name === 'company_ids_json')) {
    d.exec("ALTER TABLE resources ADD COLUMN company_ids_json TEXT NOT NULL DEFAULT '[]'");
  }
}

export type DocumentMasterRow = {
  code: string;
  label: string;
  draft_json: string;
  published_json: string;
  version: number;
  sort_order: number;
  draft_updated_at: string;
  published_at: string;
};

export function seedDocumentMastersIfEmpty(seeds: { code: string; label: string; categories: unknown[] }[]): void {
  const d = getDb();
  const insert = d.prepare(`
    INSERT OR IGNORE INTO document_masters
      (code, label, draft_json, published_json, version, sort_order)
    VALUES (?, ?, ?, ?, 1, ?)
  `);
  const insertVersion = d.prepare(`
    INSERT OR IGNORE INTO document_master_versions (master_code, version, payload_json)
    VALUES (?, 1, ?)
  `);
  const seed = d.transaction(() => {
    seeds.forEach((item, index) => {
      const payload = JSON.stringify(item.categories);
      insert.run(item.code, item.label, payload, payload, index);
      insertVersion.run(item.code, payload);
    });
  });
  seed();
}

export type PoaMatterMasterRow = {
  id: number;
  payload_json: string;
  version: number;
  updated_at: string;
};

/** 委任事項マスタが無いときだけ初期値を入れる（画面で直した内容は起動し直しても上書きしない） */
export function seedPoaMatterMasterIfEmpty(seed: unknown): void {
  getDb().prepare('INSERT OR IGNORE INTO poa_matter_master (id, payload_json) VALUES (1, ?)').run(JSON.stringify(seed));
}

export type ResourceRow = {
  id: number;
  title: string;
  description: string;
  filename: string | null;
  url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  company_ids_json: string;
};

export type PoaPrincipalRow = {
  id: number;
  kind: 'individual' | 'corporate';
  name: string;
  name_kana: string;
  address: string;
  birth_date: string;
  representative: string;
  deceased_name: string;
  memo: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AuditTargetType = 'document_master' | 'resource' | 'poa_matter' | 'poa_principal';
export type AuditAction = 'create' | 'update' | 'delete' | 'reorder' | 'publish' | 'restore';

export function writeAuditLog(entry: {
  targetType: AuditTargetType;
  targetId: string | number;
  targetName: string;
  action: AuditAction;
  actor?: string;
  before?: unknown;
  after?: unknown;
}): void {
  getDb().prepare(`
    INSERT INTO audit_logs
      (target_type, target_id, target_name, action, actor, before_json, after_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.targetType,
    String(entry.targetId),
    entry.targetName,
    entry.action,
    entry.actor?.trim() || 'ローカル利用者',
    entry.before === undefined ? null : JSON.stringify(entry.before),
    entry.after === undefined ? null : JSON.stringify(entry.after),
  );
}

// --- Seed data (existing 16 resources) ---

const SEED_DATA: { title: string; description: string; filename?: string; url?: string }[] = [
  { title: '相続・手続きスケジュール', description: '葬儀を終えた後の相続手続きの流れとスケジュール（14日以内〜1年以内）', filename: 'schedule.pdf' },
  { title: '手続き＆チェックリスト', description: '相続発生後に必要な各種届出・手続きの一覧と提出先・相談先', filename: 'checklist.pdf' },
  { title: '相続税申告後サポート', description: '二次相続対策・資産運用・不動産見直しなど申告後のサポート案内', filename: 'after-support.pdf' },
  { title: '保険を使った相続税対策', description: '生命保険の非課税枠や生前贈与を組み合わせた節税方法の解説', filename: 'life-insurance.pdf' },
  { title: '不動産リスク診断チェック表', description: '保有不動産のリスクを10項目でチェックできる診断シート', filename: 'real-estate-risk-check.pdf' },
  { title: '生計一親族チェックリスト', description: '生計を一にする親族の判定に使用するチェックリスト', filename: 'household-family-checklist.xlsx' },
  { title: '名義預金、生前贈与について', description: '名義預金の基礎知識・具体例と申告しない場合のペナルティの解説', filename: 'nominee-deposit.pdf' },
  { title: '預金移動調査について', description: '預金移動調査の目的・必要性判定フローチャートとお預かり資料の案内', filename: 'deposit-transfer-survey.pdf' },
  { title: '贈与契約書ひな形', description: '贈与契約書のひな形テンプレート', filename: 'gift-contract-template.doc' },
  { title: '未分割申告の確認書', description: '遺産が未分割の場合の申告に関する確認書', filename: 'undivided-declaration-confirmation.docx' },
  { title: '申告完了までのスケジュール', description: '相続税申告完了までの全体スケジュールと各工程の流れ', filename: 'declaration-schedule.xlsx' },
  { title: '戸籍謄本の広域交付制度', description: '最寄りの市区町村窓口で戸籍証明書をまとめて請求できる広域交付制度の案内（法務省）', filename: 'koseki-wide-area.pdf' },
  { title: '法定相続情報証明制度', description: '法定相続情報一覧図の作成手順・必要書類・申出方法の解説（法務省）', filename: 'legal-heir-info.pdf' },
  { title: '利用者識別番号とは', description: 'e-Taxで使用する利用者識別番号の概要と取得方法の解説（国税庁）', url: 'https://www.keisan.nta.go.jp/r7yokuaru_sp/cat1/cat12/cat122/cat1221/scid1437.html' },
  { title: '税務調査について', description: '相続税の税務調査に関する確認事項と対応の流れをまとめた資料', filename: 'tax-audit.docx' },
  { title: '生前対策・遺言書', description: '生前対策と遺言書作成に関するポイントをまとめた参考資料', filename: 'lifetime-planning-will.pdf' },
  { title: '名義財産検討シート', description: '名義財産の有無や検討事項を整理するためのチェックシート', filename: 'nominee-property-review-sheet.xlsx' },
];

export function seedIfEmpty(uploadsDir: string, publicFilesDir: string): void {
  const d = getDb();
  const count = (d.prepare('SELECT COUNT(*) as c FROM resources').get() as { c: number }).c;
  if (count > 0) return;

  const insert = d.prepare(
    'INSERT INTO resources (title, description, filename, url, sort_order) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = d.transaction(() => {
    SEED_DATA.forEach((r, i) => {
      insert.run(r.title, r.description, r.filename ?? null, r.url ?? null, i);
      // Copy file from public/files/ to uploads/
      if (r.filename) {
        const src = path.join(publicFilesDir, r.filename);
        const dst = path.join(uploadsDir, r.filename);
        if (fs.existsSync(src) && !fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
        }
      }
    });
  });
  tx();
}
