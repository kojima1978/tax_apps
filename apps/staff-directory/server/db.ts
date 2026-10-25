import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH ?? path.resolve('data', 'staff.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = openDb(DB_PATH);
  return db;
}

// テストは ':memory:' を渡して同じスキーマの DB を作る
export function openDb(file: string): Database.Database {
  const d = new Database(file);
  d.pragma('journal_mode = WAL');
  d.pragma('busy_timeout = 5000');
  d.pragma('foreign_keys = ON');
  initSchema(d);
  return d;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// health 用: DB を開いて読めることに加え、DB ファイルとそのフォルダに書けるかを見る
// （DB には何も書かない）。SELECT 1 だけでは「ファイルだけ書けない」状態を
// 見落とす ── 開くのも読むのも通り、実際に書いたときに初めて SQLITE_READONLY になる。
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

// スキーマの版。PRAGMA user_version に記録し、古い版の DB は開いたときに1回だけ作り替える。
// 版を上げるときは initSchema に `if (version < N)` を1つ足す（作り替えは必ずトランザクションの中で、途中で落ちたら元のまま）。
// SCHEMA_V1 は版1の形のまま凍結しておき、新しい DB も版1を作ってから順に上げる（移行の経路を1本にするため）。
export const SCHEMA_VERSION = 4;

// staff.id が「台帳ID」。各アプリはこの番号で人を参照するので、振り直さない・消さない
// （退職は retired_on を入れるだけ）。
//
// 会社は複数（関連会社）。部署は会社にぶら下がり（A社の会計部とB社の会計部は別物）、
// 人と会社は staff_affiliations で多対多。社員番号は会社ごとに振るので所属の側に持ち、
// 同じ会社の中だけで重複を禁じる（空は何人でもよい ── SQLite の UNIQUE は NULL 同士を区別する）。
// 所属の部署がその会社のものであることは複合外部キーで DB が保証する。
// 主所属は1人1つ（部分ユニーク索引）。他アプリへ「この人の社員番号・部署」として渡すのは主所属。
//
// 氏名は姓・名を別々に持つ（姓だけを出す場面と、両方を出す場面があるため）。
// 画面に出す略称・氏名は repo.ts が組み立てる（略称は手で決めたものだけ short_name に持つ。版3）。
//
// external_links は「他アプリの何番が台帳の何番か」の対応表。取込を何度流しても
// 同じ人を二重に作らないためのもので、段階3以降の同期や private-banking の紐付けも
// ここへ app 名を変えて載せる。
export const SCHEMA_V1 = `
  CREATE TABLE companies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    short_name  TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    address     TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    fax         TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE departments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    name       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (company_id, name),
    UNIQUE (id, company_id)
  );

  CREATE TABLE staff (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    family_name  TEXT NOT NULL,
    given_name   TEXT NOT NULL DEFAULT '',
    family_kana  TEXT NOT NULL DEFAULT '',
    given_kana   TEXT NOT NULL DEFAULT '',
    mobile_phone TEXT NOT NULL DEFAULT '',
    retired_on   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE staff_affiliations (
    staff_id      INTEGER NOT NULL REFERENCES staff(id),
    company_id    INTEGER NOT NULL REFERENCES companies(id),
    department_id INTEGER,
    employee_no   TEXT,
    is_primary    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (staff_id, company_id),
    UNIQUE (company_id, employee_no),
    FOREIGN KEY (department_id, company_id) REFERENCES departments(id, company_id)
  );
  CREATE UNIQUE INDEX staff_affiliations_primary_idx ON staff_affiliations(staff_id) WHERE is_primary = 1;
  CREATE INDEX staff_affiliations_department_idx ON staff_affiliations(department_id);

  CREATE TABLE IF NOT EXISTS external_links (
    app         TEXT NOT NULL,
    entity      TEXT NOT NULL CHECK (entity IN ('staff', 'department')),
    external_id TEXT NOT NULL,
    local_id    INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (app, entity, external_id)
  );
`;

// 会社が1つも無いと部署も所属も作れないので、新しい DB には1社だけ置いておく（画面で名前を直す）
export const PLACEHOLDER_COMPANY_NAME = '会社名未設定';

// 版0 → 1: 事務所1件・部署・社員（氏名1欄・社員番号と部署を社員に直接持つ形）から作り替える。
//   - 事務所 → 会社 #1（名前が空なら仮の名前）
//   - 部署 → 全部 会社 #1 の部署（id はそのまま。他アプリの写しが部署の台帳ID を持っているため）
//   - 氏名・フリガナ → 最初の空白で姓と名に分ける（空白が無ければ全部を姓に）
//   - 社員番号・部署 → 会社 #1 への主所属。部署も社員番号も無い人は所属なし
//   社員の id（台帳ID）は変えない
function migrateV0ToV1(d: Database.Database): void {
  d.exec(`
    ALTER TABLE departments RENAME TO departments_v0;
    ALTER TABLE staff RENAME TO staff_v0;
  `);
  // 旧 departments を参照していた staff_v0 の外部キーは、改名で departments_v0 を指すように書き換わる
  d.exec(SCHEMA_V1);
  d.prepare(
    `INSERT INTO companies (id, name, postal_code, address, phone, fax, updated_at)
     SELECT 1, CASE WHEN trim(name) = '' THEN ? ELSE name END, postal_code, address, phone, fax, updated_at
     FROM office WHERE id = 1`,
  ).run(PLACEHOLDER_COMPANY_NAME);
  d.prepare(`INSERT OR IGNORE INTO companies (id, name) VALUES (1, ?)`).run(PLACEHOLDER_COMPANY_NAME);
  d.exec(`
    INSERT INTO departments (id, company_id, name, sort_order, active, created_at, updated_at)
    SELECT id, 1, name, sort_order, active, created_at, updated_at FROM departments_v0;

    INSERT INTO staff (id, family_name, given_name, family_kana, given_kana, mobile_phone, retired_on, created_at, updated_at)
    SELECT id,
      CASE WHEN instr(n, ' ') > 0 THEN substr(n, 1, instr(n, ' ') - 1) ELSE n END,
      CASE WHEN instr(n, ' ') > 0 THEN replace(substr(n, instr(n, ' ') + 1), ' ', '') ELSE '' END,
      CASE WHEN instr(k, ' ') > 0 THEN substr(k, 1, instr(k, ' ') - 1) ELSE k END,
      CASE WHEN instr(k, ' ') > 0 THEN replace(substr(k, instr(k, ' ') + 1), ' ', '') ELSE '' END,
      mobile_phone, retired_on, created_at, updated_at
    -- 全角の空白（char(12288)）も区切りとして扱う（氏名は入力のまま保存していた）。2つ目以降の空白は名から詰める
    FROM (SELECT *, trim(replace(name, char(12288), ' ')) AS n, trim(name_kana) AS k FROM staff_v0);

    INSERT INTO staff_affiliations (staff_id, company_id, department_id, employee_no, is_primary)
    SELECT id, 1, department_id, employee_no, 1 FROM staff_v0
    WHERE department_id IS NOT NULL OR employee_no IS NOT NULL;
  `);
  // AUTOINCREMENT の続き番号を引き継ぐ（消した社員・部署の番号を新しい人に再利用しない）。
  // 改名した表の続き番号は sqlite_sequence の上で旧名へ付け替わっている（表を消すと一緒に消えるので、消す前に移す）
  const seqOf = d.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').pluck();
  for (const table of ['staff', 'departments']) {
    const seq = Math.max(Number(seqOf.get(table) ?? 0), Number(seqOf.get(`${table}_v0`) ?? 0));
    d.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?)').run(table, `${table}_v0`);
    if (seq > 0) d.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run(table, seq);
  }
  d.exec('DROP TABLE staff_v0; DROP TABLE departments_v0; DROP TABLE office;');
}

// 版1 → 2: 社員の住所・生年月日。個人情報なので一覧・詳細の API には出さず、
// /staff/:id/personal だけが読み書きする（repo.ts）。既存の行は空欄のまま
function migrateV1ToV2(d: Database.Database): void {
  d.exec(`
    ALTER TABLE staff ADD COLUMN postal_code TEXT NOT NULL DEFAULT '';
    ALTER TABLE staff ADD COLUMN address     TEXT NOT NULL DEFAULT '';
    ALTER TABLE staff ADD COLUMN birth_date  TEXT;
  `);
}

// 版2 → 3: 社員の略称を手で決められるようにする。空は自動（repo.ts の shortNameOf）。既存の行は空＝自動のまま
function migrateV2ToV3(d: Database.Database): void {
  d.exec(`ALTER TABLE staff ADD COLUMN short_name TEXT NOT NULL DEFAULT '';`);
}

// 版3 → 4: 会社の代表者（役職と氏名）。委任状の受任者欄に刷る。既存の行は空欄のまま
function migrateV3ToV4(d: Database.Database): void {
  d.exec(`ALTER TABLE companies ADD COLUMN representative TEXT NOT NULL DEFAULT '';`);
}

function tableExists(d: Database.Database, name: string): boolean {
  return d.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) !== undefined;
}

function initSchema(d: Database.Database): void {
  const version = d.pragma('user_version', { simple: true }) as number;
  if (version >= SCHEMA_VERSION) return;

  // 表の作り替えの間だけ外部キーの検査を止め、最後にまとめて確かめる
  // （PRAGMA foreign_keys はトランザクションの中では変えられない）
  d.pragma('foreign_keys = OFF');
  try {
    d.transaction(() => {
      if (version < 1) {
        if (tableExists(d, 'staff')) {
          migrateV0ToV1(d);
        } else {
          d.exec(SCHEMA_V1);
          d.prepare('INSERT INTO companies (name) VALUES (?)').run(PLACEHOLDER_COMPANY_NAME);
        }
      }
      if (version < 2) migrateV1ToV2(d);
      if (version < 3) migrateV2ToV3(d);
      if (version < 4) migrateV3ToV4(d);
      const broken = d.pragma('foreign_key_check') as unknown[];
      if (broken.length > 0) throw new Error(`スキーマの移行後に外部キーの不整合が ${broken.length} 件あります`);
      d.pragma(`user_version = ${SCHEMA_VERSION}`);
    })();
  } finally {
    d.pragma('foreign_keys = ON');
  }
}
