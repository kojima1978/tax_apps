import Database from 'better-sqlite3';
import path from 'path';

import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'doctor.db');
let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  database.exec(`
    -- 会社マスタテーブル
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    -- 担当者マスタテーブル
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    -- 評価レコードテーブル
    CREATE TABLE IF NOT EXISTS valuations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      fiscal_year TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 財務データテーブル
    CREATE TABLE IF NOT EXISTS financial_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valuation_id INTEGER NOT NULL,
      employees TEXT,
      total_assets TEXT,
      sales TEXT,
      current_period_net_asset REAL,
      previous_period_net_asset REAL,
      net_asset_tax_value REAL,
      current_period_profit REAL,
      previous_period_profit REAL,
      previous_previous_period_profit REAL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (valuation_id) REFERENCES valuations(id) ON DELETE CASCADE
    );

    -- 投資家テーブル
    CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valuation_id INTEGER NOT NULL,
      investor_name TEXT NOT NULL,
      shares_held INTEGER,
      shareholding_ratio REAL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (valuation_id) REFERENCES valuations(id) ON DELETE CASCADE
    );

    -- 類似業種データマスタテーブル
    CREATE TABLE IF NOT EXISTS similar_industry_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiscal_year TEXT NOT NULL UNIQUE,
      profit_per_share REAL NOT NULL DEFAULT 51,
      net_asset_per_share REAL NOT NULL DEFAULT 395,
      average_stock_price REAL NOT NULL DEFAULT 532,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    -- インデックス作成
    CREATE INDEX IF NOT EXISTS idx_valuations_company_id ON valuations(company_id);
    CREATE INDEX IF NOT EXISTS idx_valuations_user_id ON valuations(user_id);
    CREATE INDEX IF NOT EXISTS idx_financial_data_valuation_id ON financial_data(valuation_id);
    CREATE INDEX IF NOT EXISTS idx_investors_valuation_id ON investors(valuation_id);
    CREATE INDEX IF NOT EXISTS idx_similar_industry_fiscal_year ON similar_industry_data(fiscal_year);
  `);

  // デフォルトの類似業種データを挿入（令和6年度 = 2024年度）
  const defaultYear = '2024';
  const existingDefault = database.prepare('SELECT id FROM similar_industry_data WHERE fiscal_year = ?').get(defaultYear);
  if (!existingDefault) {
    database.prepare(`
      INSERT INTO similar_industry_data (fiscal_year, profit_per_share, net_asset_per_share, average_stock_price)
      VALUES (?, 51, 395, 532)
    `).run(defaultYear);
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
