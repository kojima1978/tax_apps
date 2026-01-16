import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'doctor.db');
const db = new Database(dbPath);

console.log('Starting migration: Add is_active column to similar_industry_data table');

try {
  // トランザクション開始
  db.exec('BEGIN TRANSACTION');

  // is_active カラムを追加（デフォルト値: 1 = 有効）
  db.exec(`
    ALTER TABLE similar_industry_data
    ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
  `);

  console.log('✓ Added is_active column to similar_industry_data table');

  // トランザクションをコミット
  db.exec('COMMIT');

  console.log('Migration completed successfully!');
} catch (error) {
  // エラー時はロールバック
  db.exec('ROLLBACK');
  console.error('Migration failed:', error);
  throw error;
} finally {
  db.close();
}
