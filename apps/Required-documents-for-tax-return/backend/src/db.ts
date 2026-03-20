import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Customer, DocumentRecordWithCustomer, CustomerWithYears, Staff } from './types.js';

// データベースファイルのパス
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'tax_documents.db');

// シングルトンDB接続
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');

    process.on('exit', () => {
      _db?.close();
    });
  }
  return _db;
}

// データベース操作のラッパー（シングルトン接続を使用）
function withDb<T>(operation: (db: Database.Database) => T): T {
  return operation(getDb());
}

/** 楽観ロック用エラー */
export class ConflictError extends Error {
  constructor(message = '他のユーザーまたはタブで変更が保存されています。最新データを読み込んでください。') {
    super(message);
    this.name = 'ConflictError';
  }
}

/** 書類データの upsert（楽観ロック付き） */
function upsertDocumentRecord(
  db: Database.Database, customerId: number, year: number, jsonData: string,
  expectedUpdatedAt?: string | null
): string {
  const existing = db
    .prepare('SELECT id, updated_at FROM document_records WHERE customer_id = ? AND year = ?')
    .get(customerId, year) as { id: number; updated_at: string } | undefined;

  if (existing) {
    if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
      throw new ConflictError();
    }
    const row = db.prepare(
      'UPDATE document_records SET document_groups = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND year = ? RETURNING updated_at'
    ).get(jsonData, customerId, year) as { updated_at: string };
    return row.updated_at;
  } else {
    const row = db.prepare(
      'INSERT INTO document_records (customer_id, year, document_groups) VALUES (?, ?, ?) RETURNING updated_at'
    ).get(customerId, year, jsonData) as { updated_at: string };
    return row.updated_at;
  }
}

/** 担当者の取得/作成（SELECT→無ければINSERT） */
function getOrCreateStaff(db: Database.Database, staffName: string, mobileNumber?: string | null): number {
  const existing = db.prepare('SELECT id FROM staff WHERE staff_name = ?').get(staffName) as { id: number } | undefined;
  if (existing) return existing.id;
  const info = db.prepare('INSERT INTO staff (staff_name, mobile_number) VALUES (?, ?)').run(staffName, mobileNumber || null);
  return info.lastInsertRowid as number;
}

/** カラムが存在するかチェック */
function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[];
  return columns.some(col => col.name === column);
}

/** カラムが存在しない場合に追加するマイグレーションヘルパー */
function addColumnIfMissing(
  db: Database.Database, table: string, column: string,
  alterSql: string, onAdded?: (db: Database.Database) => void
): void {
  try {
    if (hasColumn(db, table, column)) return;
    console.log(`Migrating: Adding ${column} to ${table} table...`);
    db.exec(alterSql);
    onAdded?.(db);
  } catch (e: unknown) {
    console.error(`Migration for ${column} failed:`, e);
  }
}

/** 配列をキーでグルーピングしてMapを返す */
function groupBy<T>(items: T[], keyFn: (item: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) {
      arr.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/** staff_idの存在チェック（FK検証用） */
function staffExists(db: Database.Database, staffId: number): boolean {
  return !!db.prepare('SELECT id FROM staff WHERE id = ?').get(staffId);
}

/** 顧客名+staff_idで顧客を検索 */
function findCustomerByNameAndStaffId(
  db: Database.Database, customerName: string, staffId: number | null
): { id: number } | undefined {
  return staffId
    ? db.prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_id = ?').get(customerName, staffId) as { id: number } | undefined
    : db.prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_id IS NULL').get(customerName) as { id: number } | undefined;
}

/** 顧客配列にyears/latest_updated_atを付与する共通処理 */
type YearRecord = { customer_id: number; year: number; updated_at: string };
function enrichCustomersWithYears(customers: Customer[], allRecords: YearRecord[]): CustomerWithYears[] {
  const recordsByCustomer = groupBy(allRecords, (r) => r.customer_id);
  return customers.map((customer) => {
    const records = recordsByCustomer.get(customer.id) || [];
    return {
      ...customer,
      years: records.map((r) => r.year),
      latest_updated_at: records.length > 0 ? records[0].updated_at : null,
    };
  });
}

// --- 顧客クエリの共通SELECT句 ---
const CUSTOMER_SELECT = `
  SELECT c.id, c.customer_name, c.customer_code, COALESCE(s.staff_name, '') as staff_name, c.staff_id, c.created_at, c.updated_at
  FROM customers c
  LEFT JOIN staff s ON c.staff_id = s.id
`;

// データベース初期化
export function initializeDb(): void {
  withDb((db) => {
    // Staff table
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_name TEXT NOT NULL UNIQUE,
        mobile_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add mobile_number if not exists
    addColumnIfMissing(db, 'staff', 'mobile_number', 'ALTER TABLE staff ADD COLUMN mobile_number TEXT');

    // Migration: Add staff_code if not exists
    addColumnIfMissing(db, 'staff', 'staff_code', 'ALTER TABLE staff ADD COLUMN staff_code TEXT');

    // Customers table (正規化済み: staff_nameカラムなし)
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        staff_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
      )
    `);

    // Migration: Add staff_id column if not exists (旧スキーマからの移行)
    addColumnIfMissing(
      db, 'customers', 'staff_id',
      'ALTER TABLE customers ADD COLUMN staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL',
      (db) => {
        if (!hasColumn(db, 'customers', 'staff_name')) return;
        const customers = db.prepare('SELECT id, staff_name FROM customers WHERE staff_id IS NULL').all() as { id: number, staff_name: string }[];
        const updateCustomer = db.prepare('UPDATE customers SET staff_id = ? WHERE id = ?');
        db.transaction(() => {
          for (const customer of customers) {
            const staffId = getOrCreateStaff(db, customer.staff_name);
            updateCustomer.run(staffId, customer.id);
          }
        })();
        console.log('Migration completed: staff_name → staff_id.');
      }
    );

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

    // Migration: Add customer_code if not exists
    addColumnIfMissing(db, 'customers', 'customer_code', 'ALTER TABLE customers ADD COLUMN customer_code TEXT');

    // インデックス作成
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_customers_staff_id ON customers(staff_id);
      CREATE INDEX IF NOT EXISTS idx_document_records_customer_id ON document_records(customer_id);
      CREATE INDEX IF NOT EXISTS idx_document_records_year ON document_records(year);
    `);

    // Migration: staff_name カラムを削除（3NF正規化）
    // SQLiteではALTER TABLE DROP COLUMN不可のためテーブル再作成
    if (hasColumn(db, 'customers', 'staff_name')) {
      console.log('Migrating: Removing staff_name from customers table (3NF normalization)...');
      db.pragma('foreign_keys = OFF');
      db.transaction(() => {
        db.exec(`
          CREATE TABLE customers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_code TEXT,
            staff_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
          );
          INSERT INTO customers_new (id, customer_name, customer_code, staff_id, created_at, updated_at)
            SELECT id, customer_name, customer_code, staff_id, created_at, updated_at FROM customers;
          DROP TABLE customers;
          ALTER TABLE customers_new RENAME TO customers;
          CREATE INDEX idx_customers_staff_id ON customers(staff_id);
        `);
      })();
      db.pragma('foreign_keys = ON');
      console.log('Migration completed: staff_name column removed.');
    }
  });
  console.log('Database initialized at:', dbPath);
}

// --- STAFF OPERATIONS ---

export function getAllStaff(): Staff[] {
  return withDb((db) => {
    return db.prepare('SELECT * FROM staff ORDER BY staff_name').all() as Staff[];
  });
}

export function createStaff(staffName: string, mobileNumber?: string, staffCode?: string): Staff {
  return withDb((db) => {
    const info = db.prepare('INSERT INTO staff (staff_name, mobile_number, staff_code) VALUES (?, ?, ?)').run(staffName, mobileNumber || null, staffCode || null);
    return {
      id: info.lastInsertRowid as number,
      staff_name: staffName,
      staff_code: staffCode || null,
      mobile_number: mobileNumber || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

export function updateStaff(id: number, staffName: string, mobileNumber?: string, staffCode?: string): boolean {
  return withDb((db) => {
    const info = db.prepare('UPDATE staff SET staff_name = ?, mobile_number = ?, staff_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(staffName, mobileNumber || null, staffCode || null, id);
    return info.changes > 0;
  });
}

export function deleteStaff(id: number): boolean {
  return withDb((db) => {
    const used = db.prepare('SELECT COUNT(*) as count FROM customers WHERE staff_id = ?').get(id) as { count: number };
    if (used.count > 0) {
      throw new Error('この担当者はお客様に紐づいているため削除できません。');
    }
    const info = db.prepare('DELETE FROM staff WHERE id = ?').run(id);
    return info.changes > 0;
  });
}

// --- CUSTOMER OPERATIONS ---

// 顧客をIDで取得
export function getCustomerById(id: number): Customer | null {
  return withDb((db) => {
    const customer = db
      .prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`)
      .get(id) as Customer | undefined;
    return customer ?? null;
  });
}

// 全顧客+保存済み年度一覧を取得（ダッシュボード用）
export function getAllCustomersWithYears(): CustomerWithYears[] {
  return withDb((db) => {
    const customers = db
      .prepare(`${CUSTOMER_SELECT} ORDER BY c.updated_at DESC`)
      .all() as Customer[];

    const allRecords = db
      .prepare('SELECT customer_id, year, updated_at FROM document_records ORDER BY year DESC')
      .all() as YearRecord[];

    return enrichCustomersWithYears(customers, allRecords);
  });
}

// 顧客を作成（staffIdは任意）
export function createCustomer(customerName: string, staffId?: number | null, customerCode?: string): Customer {
  return withDb((db) => {
    const resolvedStaffId = staffId ?? null;

    if (resolvedStaffId && !staffExists(db, resolvedStaffId)) {
      throw new Error('Staff not found');
    }

    const info = db
      .prepare('INSERT INTO customers (customer_name, staff_id, customer_code) VALUES (?, ?, ?)')
      .run(customerName, resolvedStaffId, customerCode || null);

    // JOINで担当者名を取得して返す
    return db
      .prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`)
      .get(info.lastInsertRowid) as Customer;
  });
}

// 顧客情報を更新（staffIdは任意）
export function updateCustomer(
  id: number,
  customerName: string,
  staffId?: number | null,
  customerCode?: string
): boolean {
  return withDb((db) => {
    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) return false;

    const resolvedStaffId = staffId ?? null;

    if (resolvedStaffId && !staffExists(db, resolvedStaffId)) return false;

    db.prepare(
      'UPDATE customers SET customer_name = ?, staff_id = ?, customer_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(customerName, resolvedStaffId, customerCode || null, id);

    return true;
  });
}

// 顧客を削除
export function deleteCustomer(id: number): boolean {
  return withDb((db) => {
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

// 顧客を作成または取得 (Legacy API用: staffName文字列ベース)
export function getOrCreateCustomer(customerName: string, staffName: string): number {
  return withDb((db) => {
    // 1. Ensure staff exists
    const staffId = getOrCreateStaff(db, staffName);

    // 2. Check for existing customer with this staff_id
    const existing = findCustomerByNameAndStaffId(db, customerName, staffId);
    if (existing) return existing.id;

    // 3. Insert new customer
    const result = db
      .prepare('INSERT INTO customers (customer_name, staff_id) VALUES (?, ?)')
      .run(customerName, staffId);

    return result.lastInsertRowid as number;
  });
}

// 書類データを保存（楽観ロック付き）
export function saveDocumentRecord(
  customerId: number, year: number, documentGroups: unknown,
  expectedUpdatedAt?: string | null
): string {
  return withDb((db) => {
    return upsertDocumentRecord(db, customerId, year, JSON.stringify(documentGroups), expectedUpdatedAt);
  });
}

// 顧客IDで書類データを取得（updated_at付き）
export function getDocumentRecordByCustomerId(
  customerId: number, year: number
): { documentGroups: unknown; updatedAt: string } | null {
  return withDb((db) => {
    const record = db
      .prepare('SELECT document_groups, updated_at FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customerId, year) as { document_groups: string; updated_at: string } | undefined;
    return record
      ? { documentGroups: JSON.parse(record.document_groups), updatedAt: record.updated_at }
      : null;
  });
}

// 顧客情報で書類データを取得（レガシーAPI用: staffName文字列ベース）
export function getDocumentRecordByCustomerInfo(
  customerName: string,
  staffName: string,
  year: number
): unknown | null {
  return withDb((db) => {
    const staff = db.prepare('SELECT id FROM staff WHERE staff_name = ?').get(staffName) as { id: number } | undefined;
    if (!staff) return null;

    const customer = findCustomerByNameAndStaffId(db, customerName, staff.id);
    if (!customer) return null;

    const record = db
      .prepare('SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?')
      .get(customer.id, year) as { document_groups: string } | undefined;

    return record ? JSON.parse(record.document_groups) : null;
  });
}

// 翌年度更新
export function copyToNextYear(customerId: number, currentYear: number): boolean {
  return withDb((db) => {
    const copyTransaction = db.transaction(() => {
      const currentRecord = db
        .prepare('SELECT document_groups FROM document_records WHERE customer_id = ? AND year = ?')
        .get(customerId, currentYear) as { document_groups: string } | undefined;

      if (!currentRecord) return false;

      upsertDocumentRecord(db, customerId, currentYear + 1, currentRecord.document_groups);
      return true;
    });

    return copyTransaction();
  });
}

// 顧客一覧を取得
export function getAllCustomers(): Customer[] {
  return withDb((db) => {
    return db
      .prepare(`${CUSTOMER_SELECT} ORDER BY c.updated_at DESC`)
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
      .prepare(`
        SELECT DISTINCT c.id, c.customer_name, COALESCE(s.staff_name, '') as staff_name, c.staff_id
        FROM customers c
        LEFT JOIN staff s ON c.staff_id = s.id
        INNER JOIN document_records d ON c.id = d.customer_id
        WHERE c.customer_name LIKE ? OR s.staff_name LIKE ?
        ORDER BY c.updated_at DESC
        LIMIT 20
      `)
      .all(searchPattern, searchPattern) as Customer[];

    if (customers.length === 0) return [];

    const customerIds = customers.map((c) => c.id);
    const placeholders = customerIds.map(() => '?').join(',');
    const allRecords = db
      .prepare(`SELECT customer_id, year, updated_at FROM document_records WHERE customer_id IN (${placeholders}) ORDER BY year DESC`)
      .all(...customerIds) as YearRecord[];

    return enrichCustomersWithYears(customers, allRecords);
  });
}

// お客様名一覧を取得（重複なし）
export function getDistinctCustomerNames(): string[] {
  return withDb((db) => {
    const customers = db
      .prepare('SELECT DISTINCT customer_name FROM customers ORDER BY customer_name')
      .all() as { customer_name: string }[];

    return customers.map((c) => c.customer_name);
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
      .prepare(`
        SELECT DISTINCT c.customer_name
        FROM customers c
        INNER JOIN staff s ON c.staff_id = s.id
        WHERE s.staff_name = ?
        ORDER BY c.customer_name
      `)
      .all(staffName) as { customer_name: string }[];

    return customers.map((c) => c.customer_name);
  });
}

// お客様名・担当者名でフィルタした年度一覧を取得
export function getYearsByCustomerAndStaff(customerName: string, staffName: string): number[] {
  return withDb((db) => {
    const years = db
      .prepare(`
        SELECT DISTINCT d.year
        FROM document_records d
        INNER JOIN customers c ON d.customer_id = c.id
        INNER JOIN staff s ON c.staff_id = s.id
        WHERE c.customer_name = ? AND s.staff_name = ?
        ORDER BY d.year DESC
      `)
      .all(customerName, staffName) as { year: number }[];

    return years.map((y) => y.year);
  });
}

// 保存データ一覧を取得（管理画面用）
export function getAllDocumentRecords(): DocumentRecordWithCustomer[] {
  return withDb((db) => {
    return db
      .prepare(`
        SELECT d.id, c.customer_name, COALESCE(s.staff_name, '') as staff_name, d.year, d.updated_at, c.id as customer_id, c.staff_id
        FROM document_records d
        INNER JOIN customers c ON d.customer_id = c.id
        LEFT JOIN staff s ON c.staff_id = s.id
        ORDER BY d.updated_at DESC
      `)
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

// 顧客ID+年度で書類データを削除
export function deleteDocumentByCustomerAndYear(customerId: number, year: number): boolean {
  return withDb((db) => {
    const result = db.prepare('DELETE FROM document_records WHERE customer_id = ? AND year = ?').run(customerId, year);
    return result.changes > 0;
  });
}

// --- バックアップ/復元 ---

// 全データをエクスポート用に取得
export function getFullBackupData(): {
  staff: Array<{ staff_name: string; staff_code: string | null; mobile_number: string | null }>;
  customers: Array<{
    customer_name: string;
    customer_code: string | null;
    staff_name: string;
    records: Array<{ year: number; document_groups: unknown }>;
  }>;
} {
  return withDb((db) => {
    const staff = db
      .prepare('SELECT staff_name, staff_code, mobile_number FROM staff ORDER BY staff_name')
      .all() as Array<{ staff_name: string; staff_code: string | null; mobile_number: string | null }>;

    const customers = db
      .prepare(`
        SELECT c.id, c.customer_name, c.customer_code, COALESCE(s.staff_name, '') as staff_name
        FROM customers c
        LEFT JOIN staff s ON c.staff_id = s.id
        ORDER BY c.customer_name
      `)
      .all() as Array<{ id: number; customer_name: string; customer_code: string | null; staff_name: string }>;

    const allRecords = db
      .prepare('SELECT customer_id, year, document_groups FROM document_records ORDER BY year')
      .all() as Array<{ customer_id: number; year: number; document_groups: string }>;

    const recordsByCustomer = groupBy(allRecords, (r) => r.customer_id);

    const customersWithRecords = customers.map((customer) => {
      const records = recordsByCustomer.get(customer.id) || [];
      return {
        customer_name: customer.customer_name,
        customer_code: customer.customer_code,
        staff_name: customer.staff_name,
        records: records.map((r) => ({
          year: r.year,
          document_groups: JSON.parse(r.document_groups),
        })),
      };
    });

    return { staff, customers: customersWithRecords };
  });
}

// バックアップデータから復元
export function restoreFullBackup(data: {
  staff: Array<{ staff_name: string; staff_code?: string | null; mobile_number: string | null }>;
  customers: Array<{
    customer_name: string;
    customer_code?: string | null;
    staff_name: string;
    records: Array<{ year: number; document_groups: unknown }>;
  }>;
}): { staffCount: number; customerCount: number; recordCount: number } {
  return withDb((db) => {
    return db.transaction(() => {
      let staffCount = 0;
      let customerCount = 0;
      let recordCount = 0;

      // 1. 担当者の upsert
      for (const s of data.staff) {
        getOrCreateStaff(db, s.staff_name, s.mobile_number);
        staffCount++;
      }

      // 2. 顧客と書類データの upsert
      for (const c of data.customers) {
        const staffId = c.staff_name ? getOrCreateStaff(db, c.staff_name) : null;

        let customer = findCustomerByNameAndStaffId(db, c.customer_name, staffId);

        if (!customer) {
          const info = db
            .prepare('INSERT INTO customers (customer_name, staff_id) VALUES (?, ?)')
            .run(c.customer_name, staffId);
          customer = { id: info.lastInsertRowid as number };
        }
        customerCount++;

        for (const r of c.records) {
          upsertDocumentRecord(db, customer.id, r.year, JSON.stringify(r.document_groups));
          recordCount++;
        }
      }

      return { staffCount, customerCount, recordCount };
    })();
  });
}
