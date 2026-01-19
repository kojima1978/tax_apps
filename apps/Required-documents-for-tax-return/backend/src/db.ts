import Database from 'better-sqlite3';
import path from 'path';
import { Customer, DocumentRecordWithCustomer, CustomerWithYears } from './types';

// データベースファイルのパス
const dbPath = path.join(__dirname, '..', 'data', 'tax_documents.db');

// データベース接続を取得
function getDb(): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

// データベース操作のラッパー
function withDb<T>(operation: (db: Database.Database) => T): T {
  const db = getDb();
  try {
    return operation(db);
  } finally {
    db.close();
  }
}

// データベース初期化
export function initializeDb(): void {
  withDb((db) => {
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
  });
  console.log('Database initialized at:', dbPath);
}

// 顧客を作成または取得
export function getOrCreateCustomer(customerName: string, staffName: string): number {
  return withDb((db) => {
    const existing = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?')
      .get(customerName, staffName) as { id: number } | undefined;

    if (existing) {
      return existing.id;
    }

    const result = db
      .prepare('INSERT INTO customers (customer_name, staff_name) VALUES (?, ?)')
      .run(customerName, staffName);

    return result.lastInsertRowid as number;
  });
}

// 書類データを保存
export function saveDocumentRecord(customerId: number, year: number, documentGroups: unknown): void {
  withDb((db) => {
    const existing = db
      .prepare('SELECT id FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customerId, year);

    const jsonData = JSON.stringify(documentGroups);

    if (existing) {
      db.prepare(
        'UPDATE document_records SET document_groups = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND year = ?'
      ).run(jsonData, customerId, year);
    } else {
      db.prepare('INSERT INTO document_records (customer_id, year, document_groups) VALUES (?, ?, ?)').run(
        customerId,
        year,
        jsonData
      );
    }
  });
}

// 書類データを取得
export function getDocumentRecord(customerId: number, year: number): unknown | null {
  return withDb((db) => {
    const record = db
      .prepare('SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customerId, year) as { document_groups: string } | undefined;

    return record ? JSON.parse(record.document_groups) : null;
  });
}

// 顧客情報で書類データを取得
export function getDocumentRecordByCustomerInfo(
  customerName: string,
  staffName: string,
  year: number
): unknown | null {
  return withDb((db) => {
    const customer = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?')
      .get(customerName, staffName) as { id: number } | undefined;

    if (!customer) {
      return null;
    }

    const record = db
      .prepare('SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customer.id, year) as { document_groups: string } | undefined;

    return record ? JSON.parse(record.document_groups) : null;
  });
}

// 翌年度更新
export function copyToNextYear(customerId: number, currentYear: number): boolean {
  return withDb((db) => {
    const currentRecord = db
      .prepare('SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customerId, currentYear) as { document_groups: string } | undefined;

    if (!currentRecord) {
      return false;
    }

    const nextYear = currentYear + 1;
    const existingNext = db
      .prepare('SELECT id FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customerId, nextYear);

    if (existingNext) {
      db.prepare(
        'UPDATE document_records SET document_groups = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND year = ?'
      ).run(currentRecord.document_groups, customerId, nextYear);
    } else {
      db.prepare('INSERT INTO document_records (customer_id, year, document_groups) VALUES (?, ?, ?)').run(
        customerId,
        nextYear,
        currentRecord.document_groups
      );
    }

    return true;
  });
}

// 顧客一覧を取得
export function getAllCustomers(): Customer[] {
  return withDb((db) => {
    return db
      .prepare('SELECT id, customer_name, staff_name FROM customers ORDER BY updated_at DESC')
      .all() as Customer[];
  });
}

// 顧客の年度一覧を取得
export function getCustomerYears(customerId: number): number[] {
  return withDb((db) => {
    const records = db
      .prepare('SELECT year FROM document_records WHERE customer_id = ? ORDER BY year DESC')
      .all(customerId) as { year: number }[];

    return records.map((r) => r.year);
  });
}

// 顧客を検索
export function searchCustomers(query: string): CustomerWithYears[] {
  return withDb((db) => {
    const searchPattern = `%${query}%`;
    const customers = db
      .prepare(
        `
        SELECT DISTINCT c.id, c.customer_name, c.staff_name
        FROM customers c
        INNER JOIN document_records d ON c.id = d.customer_id
        WHERE c.customer_name LIKE ? OR c.staff_name LIKE ?
        ORDER BY c.updated_at DESC
        LIMIT 20
      `
      )
      .all(searchPattern, searchPattern) as Customer[];

    return customers.map((customer) => {
      const years = db
        .prepare('SELECT year FROM document_records WHERE customer_id = ? ORDER BY year DESC')
        .all(customer.id) as { year: number }[];

      return { ...customer, years: years.map((y) => y.year) };
    });
  });
}

// お客様名一覧を取得（重複なし）
export function getDistinctCustomerNames(): string[] {
  return withDb((db) => {
    const customers = db
      .prepare(
        `
        SELECT DISTINCT c.customer_name
        FROM customers c
        INNER JOIN document_records d ON c.id = d.customer_id
        ORDER BY c.customer_name
      `
      )
      .all() as { customer_name: string }[];

    return customers.map((c) => c.customer_name);
  });
}

// 担当者名一覧を取得（重複なし）
export function getDistinctStaffNames(): string[] {
  return withDb((db) => {
    const staff = db
      .prepare(
        `
        SELECT DISTINCT c.staff_name
        FROM customers c
        INNER JOIN document_records d ON c.id = d.customer_id
        ORDER BY c.staff_name
      `
      )
      .all() as { staff_name: string }[];

    return staff.map((s) => s.staff_name);
  });
}

// 保存済み年度一覧を取得（重複なし）
export function getDistinctYears(): number[] {
  return withDb((db) => {
    const years = db
      .prepare('SELECT DISTINCT year FROM document_records ORDER BY year DESC')
      .all() as { year: number }[];

    return years.map((y) => y.year);
  });
}

// 担当者名でフィルタしたお客様名一覧を取得
export function getCustomerNamesByStaff(staffName: string): string[] {
  return withDb((db) => {
    const customers = db
      .prepare(
        `
        SELECT DISTINCT c.customer_name
        FROM customers c
        INNER JOIN document_records d ON c.id = d.customer_id
        WHERE c.staff_name = ?
        ORDER BY c.customer_name
      `
      )
      .all(staffName) as { customer_name: string }[];

    return customers.map((c) => c.customer_name);
  });
}

// お客様名・担当者名でフィルタした年度一覧を取得
export function getYearsByCustomerAndStaff(customerName: string, staffName: string): number[] {
  return withDb((db) => {
    const years = db
      .prepare(
        `
        SELECT DISTINCT d.year
        FROM document_records d
        INNER JOIN customers c ON d.customer_id = c.id
        WHERE c.customer_name = ? AND c.staff_name = ?
        ORDER BY d.year DESC
      `
      )
      .all(customerName, staffName) as { year: number }[];

    return years.map((y) => y.year);
  });
}

// 保存データ一覧を取得（管理画面用）
export function getAllDocumentRecords(): DocumentRecordWithCustomer[] {
  return withDb((db) => {
    return db
      .prepare(
        `
        SELECT d.id, c.customer_name, c.staff_name, d.year, d.updated_at
        FROM document_records d
        INNER JOIN customers c ON d.customer_id = c.id
        ORDER BY d.updated_at DESC
      `
      )
      .all() as DocumentRecordWithCustomer[];
  });
}

// 書類データを削除
export function deleteDocumentRecord(id: number): boolean {
  return withDb((db) => {
    const result = db.prepare('DELETE FROM document_records WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

// 顧客情報を更新
export function updateCustomerInfo(
  oldCustomerName: string,
  oldStaffName: string,
  newCustomerName: string,
  newStaffName: string
): boolean {
  return withDb((db) => {
    const existing = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?')
      .get(oldCustomerName, oldStaffName) as { id: number } | undefined;

    if (!existing) {
      return false;
    }

    const duplicate = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_name = ? AND id != ?')
      .get(newCustomerName, newStaffName, existing.id);

    if (duplicate) {
      return false;
    }

    db.prepare(
      'UPDATE customers SET customer_name = ?, staff_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(newCustomerName, newStaffName, existing.id);

    return true;
  });
}
