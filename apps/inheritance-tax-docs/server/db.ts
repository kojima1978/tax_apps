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
    )
  `);
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
};

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
