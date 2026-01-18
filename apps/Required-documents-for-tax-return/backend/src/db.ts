import Database from 'better-sqlite3';
import path from 'path';

// データベースファイルのパス
const dbPath = path.join(__dirname, '..', 'data', 'tax_documents.db');

// データベース接続を取得
function getDb() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

// データベース初期化
export function initializeDb() {
  const db = getDb();

  // 顧客テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customer_name, staff_name)
    )
  `);

  // 年度別書類データテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      document_groups TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      UNIQUE(customer_id, year)
    )
  `);

  db.close();
  console.log('Database initialized at:', dbPath);
}

// 顧客を作成または取得
export function getOrCreateCustomer(customerName: string, staffName: string): number {
  const db = getDb();

  // 既存の顧客を検索
  const existing = db.prepare(
    'SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?'
  ).get(customerName, staffName) as { id: number } | undefined;

  if (existing) {
    db.close();
    return existing.id;
  }

  // 新規作成
  const result = db.prepare(
    'INSERT INTO customers (customer_name, staff_name) VALUES (?, ?)'
  ).run(customerName, staffName);

  db.close();
  return result.lastInsertRowid as number;
}

// 書類データを保存
export function saveDocumentRecord(
  customerId: number,
  year: number,
  documentGroups: unknown
): void {
  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM document_records WHERE customer_id = ? AND year = ?'
  ).get(customerId, year);

  if (existing) {
    db.prepare(
      'UPDATE document_records SET document_groups = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND year = ?'
    ).run(JSON.stringify(documentGroups), customerId, year);
  } else {
    db.prepare(
      'INSERT INTO document_records (customer_id, year, document_groups) VALUES (?, ?, ?)'
    ).run(customerId, year, JSON.stringify(documentGroups));
  }

  db.close();
}

// 書類データを取得
export function getDocumentRecord(
  customerId: number,
  year: number
): unknown | null {
  const db = getDb();

  const record = db.prepare(
    'SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?'
  ).get(customerId, year) as { document_groups: string } | undefined;

  db.close();

  if (record) {
    return JSON.parse(record.document_groups);
  }
  return null;
}

// 顧客IDで書類データを取得
export function getDocumentRecordByCustomerInfo(
  customerName: string,
  staffName: string,
  year: number
): unknown | null {
  const db = getDb();

  const customer = db.prepare(
    'SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?'
  ).get(customerName, staffName) as { id: number } | undefined;

  if (!customer) {
    db.close();
    return null;
  }

  const record = db.prepare(
    'SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?'
  ).get(customer.id, year) as { document_groups: string } | undefined;

  db.close();

  if (record) {
    return JSON.parse(record.document_groups);
  }
  return null;
}

// 翌年度更新：現在の年度のデータをコピーして翌年のデータを作成
export function copyToNextYear(
  customerId: number,
  currentYear: number
): boolean {
  const db = getDb();

  // 現在の年度のデータを取得
  const currentRecord = db.prepare(
    'SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?'
  ).get(customerId, currentYear) as { document_groups: string } | undefined;

  if (!currentRecord) {
    db.close();
    return false;
  }

  const nextYear = currentYear + 1;

  // 翌年度のデータが既に存在するか確認
  const existingNext = db.prepare(
    'SELECT id FROM document_records WHERE customer_id = ? AND year = ?'
  ).get(customerId, nextYear);

  if (existingNext) {
    // 既存データを更新
    db.prepare(
      'UPDATE document_records SET document_groups = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND year = ?'
    ).run(currentRecord.document_groups, customerId, nextYear);
  } else {
    // 新規作成
    db.prepare(
      'INSERT INTO document_records (customer_id, year, document_groups) VALUES (?, ?, ?)'
    ).run(customerId, nextYear, currentRecord.document_groups);
  }

  db.close();
  return true;
}

// 顧客一覧を取得
export function getAllCustomers(): { id: number; customer_name: string; staff_name: string }[] {
  const db = getDb();

  const customers = db.prepare(
    'SELECT id, customer_name, staff_name FROM customers ORDER BY updated_at DESC'
  ).all() as { id: number; customer_name: string; staff_name: string }[];

  db.close();
  return customers;
}

// 顧客の年度一覧を取得
export function getCustomerYears(customerId: number): number[] {
  const db = getDb();

  const records = db.prepare(
    'SELECT year FROM document_records WHERE customer_id = ? ORDER BY year DESC'
  ).all(customerId) as { year: number }[];

  db.close();
  return records.map((r) => r.year);
}

// 顧客を検索（お客様名または担当者名で部分一致検索）
export function searchCustomers(query: string): {
  id: number;
  customer_name: string;
  staff_name: string;
  years: number[];
}[] {
  const db = getDb();

  const searchPattern = `%${query}%`;
  const customers = db.prepare(`
    SELECT DISTINCT c.id, c.customer_name, c.staff_name
    FROM customers c
    INNER JOIN document_records d ON c.id = d.customer_id
    WHERE c.customer_name LIKE ? OR c.staff_name LIKE ?
    ORDER BY c.updated_at DESC
    LIMIT 20
  `).all(searchPattern, searchPattern) as { id: number; customer_name: string; staff_name: string }[];

  // 各顧客の年度一覧を取得
  const results = customers.map((customer) => {
    const years = db.prepare(
      'SELECT year FROM document_records WHERE customer_id = ? ORDER BY year DESC'
    ).all(customer.id) as { year: number }[];

    return {
      ...customer,
      years: years.map((y) => y.year),
    };
  });

  db.close();
  return results;
}

// お客様名一覧を取得（重複なし）
export function getDistinctCustomerNames(): string[] {
  const db = getDb();

  const customers = db.prepare(`
    SELECT DISTINCT c.customer_name
    FROM customers c
    INNER JOIN document_records d ON c.id = d.customer_id
    ORDER BY c.customer_name
  `).all() as { customer_name: string }[];

  db.close();
  return customers.map((c) => c.customer_name);
}

// 担当者名一覧を取得（重複なし）
export function getDistinctStaffNames(): string[] {
  const db = getDb();

  const staff = db.prepare(`
    SELECT DISTINCT c.staff_name
    FROM customers c
    INNER JOIN document_records d ON c.id = d.customer_id
    ORDER BY c.staff_name
  `).all() as { staff_name: string }[];

  db.close();
  return staff.map((s) => s.staff_name);
}

// 保存済み年度一覧を取得（重複なし）
export function getDistinctYears(): number[] {
  const db = getDb();

  const years = db.prepare(`
    SELECT DISTINCT year FROM document_records ORDER BY year DESC
  `).all() as { year: number }[];

  db.close();
  return years.map((y) => y.year);
}

// 条件に一致するお客様名を取得（担当者名でフィルタ）
export function getCustomerNamesByStaff(staffName: string): string[] {
  const db = getDb();

  const customers = db.prepare(`
    SELECT DISTINCT c.customer_name
    FROM customers c
    INNER JOIN document_records d ON c.id = d.customer_id
    WHERE c.staff_name = ?
    ORDER BY c.customer_name
  `).all(staffName) as { customer_name: string }[];

  db.close();
  return customers.map((c) => c.customer_name);
}

// 条件に一致する年度を取得（お客様名・担当者名でフィルタ）
export function getYearsByCustomerAndStaff(customerName: string, staffName: string): number[] {
  const db = getDb();

  const years = db.prepare(`
    SELECT DISTINCT d.year
    FROM document_records d
    INNER JOIN customers c ON d.customer_id = c.id
    WHERE c.customer_name = ? AND c.staff_name = ?
    ORDER BY d.year DESC
  `).all(customerName, staffName) as { year: number }[];

  db.close();
  return years.map((y) => y.year);
}

// 保存データ一覧を取得（管理画面用）
export function getAllDocumentRecords(): {
  id: number;
  customer_name: string;
  staff_name: string;
  year: number;
  updated_at: string;
}[] {
  const db = getDb();

  const records = db.prepare(`
    SELECT d.id, c.customer_name, c.staff_name, d.year, d.updated_at
    FROM document_records d
    INNER JOIN customers c ON d.customer_id = c.id
    ORDER BY d.updated_at DESC
  `).all() as {
    id: number;
    customer_name: string;
    staff_name: string;
    year: number;
    updated_at: string;
  }[];

  db.close();
  return records;
}

// 書類データを削除
export function deleteDocumentRecord(id: number): boolean {
  const db = getDb();

  const result = db.prepare('DELETE FROM document_records WHERE id = ?').run(id);

  db.close();
  return result.changes > 0;
}

// 顧客情報を更新
export function updateCustomerInfo(
  oldCustomerName: string,
  oldStaffName: string,
  newCustomerName: string,
  newStaffName: string
): boolean {
  const db = getDb();

  // 既存の顧客を検索
  const existing = db.prepare(
    'SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?'
  ).get(oldCustomerName, oldStaffName) as { id: number } | undefined;

  if (!existing) {
    db.close();
    return false;
  }

  // 新しい名前の組み合わせが既に存在するか確認（自分以外）
  const duplicate = db.prepare(
    'SELECT id FROM customers WHERE customer_name = ? AND staff_name = ? AND id != ?'
  ).get(newCustomerName, newStaffName, existing.id);

  if (duplicate) {
    db.close();
    return false; // 重複エラー
  }

  db.prepare(
    'UPDATE customers SET customer_name = ?, staff_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(newCustomerName, newStaffName, existing.id);

  db.close();
  return true;
}
