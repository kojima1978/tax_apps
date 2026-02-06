import Database from 'better-sqlite3';
import path from 'path';
import { Customer, DocumentRecordWithCustomer, CustomerWithYears, Staff } from './types';

// データベースファイルのパス
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
    try {
      const columns = db.pragma('table_info(staff)') as { name: string }[];
      const hasMobileNumber = columns.some(col => col.name === 'mobile_number');
      if (!hasMobileNumber) {
        console.log('Migrating: Adding mobile_number to staff table...');
        db.exec('ALTER TABLE staff ADD COLUMN mobile_number TEXT');
      }
    } catch (e: unknown) {
      console.error('Migration for mobile_number failed:', e);
    }

    // Customers table (ensure generic structure)
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        staff_name TEXT NOT NULL, -- Keep for legacy/fallback
        staff_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
        UNIQUE(customer_name, staff_name)
      )
    `);

    // Add staff_id column if not exists (Migration)
    // Legacy migration code - can be kept for robust startup but commenting out if we assume fresh start or already migrated.
    // Keeping it active for safety as it handles idempotent check.
    try {
      const columns = db.pragma('table_info(customers)') as { name: string }[];
      const hasStaffId = columns.some(col => col.name === 'staff_id');

      if (!hasStaffId) {
        console.log('Migrating: Adding staff_id to customers table...');
        db.exec('ALTER TABLE customers ADD COLUMN staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL');

        // Migrate existing staff names to staff table
        const customers = db.prepare('SELECT id, staff_name FROM customers WHERE staff_id IS NULL').all() as { id: number, staff_name: string }[];

        const insertStaff = db.prepare('INSERT OR IGNORE INTO staff (staff_name) VALUES (?)');
        const getStaffId = db.prepare('SELECT id FROM staff WHERE staff_name = ?');
        const updateCustomer = db.prepare('UPDATE customers SET staff_id = ? WHERE id = ?');

        db.transaction(() => {
          for (const customer of customers) {
            insertStaff.run(customer.staff_name);
            const staff = getStaffId.get(customer.staff_name) as { id: number };
            if (staff) {
              updateCustomer.run(staff.id, customer.id);
            }
          }
        })();
        console.log('Migration completed.');
      }
    } catch (e: unknown) {
      console.error('Migration failed:', e);
    }

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

    // インデックス作成
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_customers_staff_id ON customers(staff_id);
      CREATE INDEX IF NOT EXISTS idx_customers_staff_name ON customers(staff_name);
      CREATE INDEX IF NOT EXISTS idx_document_records_customer_id ON document_records(customer_id);
      CREATE INDEX IF NOT EXISTS idx_document_records_year ON document_records(year);
    `);
  });
  console.log('Database initialized at:', dbPath);
}

// --- STAFF OPERATIONS ---

export function getAllStaff(): Staff[] {
  return withDb((db) => {
    return db.prepare('SELECT * FROM staff ORDER BY staff_name').all() as Staff[];
  });
}

export function createStaff(staffName: string, mobileNumber?: string): Staff {
  return withDb((db) => {
    const info = db.prepare('INSERT INTO staff (staff_name, mobile_number) VALUES (?, ?)').run(staffName, mobileNumber || null);
    return {
      id: info.lastInsertRowid as number,
      staff_name: staffName,
      mobile_number: mobileNumber || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

export function updateStaff(id: number, staffName: string, mobileNumber?: string): boolean {
  return withDb((db) => {
    const info = db.prepare('UPDATE staff SET staff_name = ?, mobile_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(staffName, mobileNumber || null, id);
    // Also update denormalized staff_name in customers for backward compatibility
    if (info.changes > 0) {
      db.prepare('UPDATE customers SET staff_name = ? WHERE staff_id = ?').run(staffName, id);
    }
    return info.changes > 0;
  });
}

export function deleteStaff(id: number): boolean {
  return withDb((db) => {
    // Check if used
    const used = db.prepare('SELECT COUNT(*) as count FROM customers WHERE staff_id = ?').get(id) as { count: number };
    if (used.count > 0) {
      throw new Error('この担当者はお客様に紐づいているため削除できません。');
    }
    const info = db.prepare('DELETE FROM staff WHERE id = ?').run(id);
    return info.changes > 0;
  });
}

// --- CUSTOMER OPERATIONS ---

// 顧客を作成
export function createCustomer(customerName: string, staffId: number): Customer {
  return withDb((db) => {
    // Check duplication
    const existing = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_id = ?')
      .get(customerName, staffId);

    if (existing) {
      throw new Error('Customer already exists for this staff.');
    }

    // Get staff name for legacy backward compatibility
    const staff = db.prepare('SELECT staff_name FROM staff WHERE id = ?').get(staffId) as { staff_name: string } | undefined;
    if (!staff) throw new Error('Staff not found');

    const info = db
      .prepare('INSERT INTO customers (customer_name, staff_name, staff_id) VALUES (?, ?, ?)')
      .run(customerName, staff.staff_name, staffId);

    return {
      id: info.lastInsertRowid as number,
      customer_name: customerName,
      staff_name: staff.staff_name,
      staff_id: staffId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

// 顧客情報を更新 (Renamed from updateCustomerInfo and simplified)
export function updateCustomer(
  id: number,
  customerName: string,
  staffId: number
): boolean {
  return withDb((db) => {
    // 1. Get existing customer
    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) return false;

    // 2. Check for duplicates (excluding self)
    const duplicate = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_id = ? AND id != ?')
      .get(customerName, staffId, id);

    if (duplicate) return false;

    // 3. Get staff name for legacy
    const staff = db.prepare('SELECT staff_name FROM staff WHERE id = ?').get(staffId) as { staff_name: string } | undefined;
    if (!staff) return false;

    db.prepare(
      'UPDATE customers SET customer_name = ?, staff_name = ?, staff_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(customerName, staff.staff_name, staffId, id);

    return true;
  });
}

// 顧客を削除
export function deleteCustomer(id: number): boolean {
  return withDb((db) => {
    // Note: cascade delete is enabled for document_records via foreign key in schema, 
    // but better to be explicit or safe. The schema at line 91 has ON DELETE CASCADE.
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

// 顧客を作成または取得 (Legacy/Find-first style)
export function getOrCreateCustomer(customerName: string, staffName: string): number {
  return withDb((db) => {
    // 1. Ensure staff exists
    let staff = db.prepare('SELECT id FROM staff WHERE staff_name = ?').get(staffName) as { id: number } | undefined;
    if (!staff) {
      const info = db.prepare('INSERT INTO staff (staff_name) VALUES (?)').run(staffName);
      staff = { id: info.lastInsertRowid as number };
    }

    // 2. Check for existing customer with this staff_id
    const existing = db
      .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_id = ?')
      .get(customerName, staff.id) as { id: number } | undefined;

    if (existing) {
      return existing.id;
    }

    // 3. Insert new customer
    const result = db
      .prepare('INSERT INTO customers (customer_name, staff_name, staff_id) VALUES (?, ?, ?)')
      .run(customerName, staffName, staff.id);

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

// 顧客情報で書類データを取得
export function getDocumentRecordByCustomerInfo(
  customerName: string,
  staffName: string,
  year: number
): unknown | null {
  return withDb((db) => {
    // Try to find customer by name + staff_name (legacy compatible) or staff_id via name lookup
    const staff = db.prepare('SELECT id FROM staff WHERE staff_name = ?').get(staffName) as { id: number } | undefined;

    let query = 'SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?';
    let params: (string | number)[] = [customerName, staffName];

    if (staff) {
      query = 'SELECT id FROM customers WHERE customer_name = ? AND (staff_id = ? OR staff_name = ?)';
      params = [customerName, staff.id, staffName];
    }

    const customer = db.prepare(query).get(...params) as { id: number } | undefined;

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
    const copyTransaction = db.transaction(() => {
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

    return copyTransaction();
  });
}

// 顧客一覧を取得 (Updated join)
export function getAllCustomers(): Customer[] {
  return withDb((db) => {
    return db
      .prepare(`
        SELECT c.id, c.customer_name, c.staff_name, c.staff_id, c.created_at, c.updated_at
        FROM customers c
        LEFT JOIN staff s ON c.staff_id = s.id
        ORDER BY c.updated_at DESC
      `)
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

// 顧客を検索 (Updated)
export function searchCustomers(query: string): CustomerWithYears[] {
  return withDb((db) => {
    const searchPattern = `%${query}%`;
    const customers = db
      .prepare(
        `
        SELECT DISTINCT c.id, c.customer_name, c.staff_name, c.staff_id
        FROM customers c
        LEFT JOIN staff s ON c.staff_id = s.id
        INNER JOIN document_records d ON c.id = d.customer_id
        WHERE c.customer_name LIKE ? OR c.staff_name LIKE ? OR s.staff_name LIKE ?
        ORDER BY c.updated_at DESC
        LIMIT 20
      `
      )
      .all(searchPattern, searchPattern, searchPattern) as Customer[];

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
        ORDER BY c.customer_name
      `
      )
      .all() as { customer_name: string }[];

    return customers.map((c) => c.customer_name);
  });
}

// 担当者名一覧を取得
export function getDistinctStaffNames(): string[] {
  return withDb((db) => {
    const staffs = db.prepare('SELECT staff_name FROM staff ORDER BY staff_name').all() as { staff_name: string }[];
    return staffs.map(s => s.staff_name);
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

// 担当者名でフィルタしたお客様名一覧を取得 (Updated logic)
export function getCustomerNamesByStaff(staffName: string): string[] {
  return withDb((db) => {
    const customers = db
      .prepare(
        `
        SELECT DISTINCT c.customer_name
        FROM customers c
        LEFT JOIN staff s ON c.staff_id = s.id
        WHERE c.staff_name = ? OR s.staff_name = ?
        ORDER BY c.customer_name
      `
      )
      .all(staffName, staffName) as { customer_name: string }[];

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
        LEFT JOIN staff s ON c.staff_id = s.id
        WHERE c.customer_name = ? AND (c.staff_name = ? OR s.staff_name = ?)
        ORDER BY d.year DESC
      `
      )
      .all(customerName, staffName, staffName) as { year: number }[];

    return years.map((y) => y.year);
  });
}

// 保存データ一覧を取得（管理画面用）
export function getAllDocumentRecords(): DocumentRecordWithCustomer[] {
  return withDb((db) => {
    return db
      .prepare(
        `
        SELECT d.id, c.customer_name, IFNULL(s.staff_name, c.staff_name) as staff_name, d.year, d.updated_at, c.id as customer_id, c.staff_id
        FROM document_records d
        INNER JOIN customers c ON d.customer_id = c.id
        LEFT JOIN staff s ON c.staff_id = s.id
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

// --- バックアップ/復元 ---

// 全データをエクスポート用に取得
export function getFullBackupData(): {
  staff: Array<{ staff_name: string; mobile_number: string | null }>;
  customers: Array<{
    customer_name: string;
    staff_name: string;
    records: Array<{ year: number; document_groups: unknown }>;
  }>;
} {
  return withDb((db) => {
    const staff = db
      .prepare('SELECT staff_name, mobile_number FROM staff ORDER BY staff_name')
      .all() as Array<{ staff_name: string; mobile_number: string | null }>;

    const customers = db
      .prepare(
        `SELECT c.id, c.customer_name, IFNULL(s.staff_name, c.staff_name) as staff_name
         FROM customers c
         LEFT JOIN staff s ON c.staff_id = s.id
         ORDER BY c.customer_name`
      )
      .all() as Array<{ id: number; customer_name: string; staff_name: string }>;

    const customersWithRecords = customers.map((customer) => {
      const records = db
        .prepare('SELECT year, document_groups FROM document_records WHERE customer_id = ? ORDER BY year')
        .all(customer.id) as Array<{ year: number; document_groups: string }>;

      return {
        customer_name: customer.customer_name,
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
  staff: Array<{ staff_name: string; mobile_number: string | null }>;
  customers: Array<{
    customer_name: string;
    staff_name: string;
    records: Array<{ year: number; document_groups: unknown }>;
  }>;
}): { staffCount: number; customerCount: number; recordCount: number } {
  return withDb((db) => {
    return db.transaction(() => {
      let staffCount = 0;
      let customerCount = 0;
      let recordCount = 0;

      const insertStaff = db.prepare(
        'INSERT OR IGNORE INTO staff (staff_name, mobile_number) VALUES (?, ?)'
      );
      const getStaffId = db.prepare('SELECT id FROM staff WHERE staff_name = ?');

      // 1. 担当者の upsert
      for (const s of data.staff) {
        insertStaff.run(s.staff_name, s.mobile_number);
        staffCount++;
      }

      // 2. 顧客と書類データの upsert
      for (const c of data.customers) {
        const staff = getStaffId.get(c.staff_name) as { id: number } | undefined;
        const staffId = staff?.id ?? null;

        let customer = db
          .prepare('SELECT id FROM customers WHERE customer_name = ? AND staff_name = ?')
          .get(c.customer_name, c.staff_name) as { id: number } | undefined;

        if (!customer) {
          const info = db
            .prepare('INSERT INTO customers (customer_name, staff_name, staff_id) VALUES (?, ?, ?)')
            .run(c.customer_name, c.staff_name, staffId);
          customer = { id: info.lastInsertRowid as number };
        }
        customerCount++;

        for (const r of c.records) {
          const jsonData = JSON.stringify(r.document_groups);
          const existing = db
            .prepare('SELECT id FROM document_records WHERE customer_id = ? AND year = ?')
            .get(customer.id, r.year);

          if (existing) {
            db.prepare(
              'UPDATE document_records SET document_groups = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND year = ?'
            ).run(jsonData, customer.id, r.year);
          } else {
            db.prepare(
              'INSERT INTO document_records (customer_id, year, document_groups) VALUES (?, ?, ?)'
            ).run(customer.id, r.year, jsonData);
          }
          recordCount++;
        }
      }

      return { staffCount, customerCount, recordCount };
    })();
  });
}
