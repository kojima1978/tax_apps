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

// staff.id が「台帳ID」。各アプリはこの番号で人を参照するので、振り直さない・消さない
// （退職は retired_on を入れるだけ）。employee_no は仮IDを含むただの属性で、
// 空を許し、入っているものだけ重複を禁じる（SQLite の UNIQUE は NULL 同士を区別する）。
//
// external_links は「他アプリの何番が台帳の何番か」の対応表。取込を何度流しても
// 同じ人を二重に作らないためのもので、段階3以降の同期や private-banking の紐付けも
// ここへ app 名を変えて載せる。
function initSchema(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS staff (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no   TEXT UNIQUE,
      name          TEXT NOT NULL,
      name_kana     TEXT NOT NULL DEFAULT '',
      department_id INTEGER REFERENCES departments(id),
      mobile_phone  TEXT NOT NULL DEFAULT '',
      retired_on    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS staff_department_idx ON staff(department_id);

    CREATE TABLE IF NOT EXISTS office (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      name        TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      address     TEXT NOT NULL DEFAULT '',
      phone       TEXT NOT NULL DEFAULT '',
      fax         TEXT NOT NULL DEFAULT '',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO office (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS external_links (
      app         TEXT NOT NULL,
      entity      TEXT NOT NULL CHECK (entity IN ('staff', 'department')),
      external_id TEXT NOT NULL,
      local_id    INTEGER NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (app, entity, external_id)
    );
  `);
}
