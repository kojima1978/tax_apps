import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, PLACEHOLDER_COMPANY_NAME, SCHEMA_V1, SCHEMA_VERSION } from './db.js';
import { getStaff, getStaffPersonal, listCompanies, listDepartments, listStaff } from './repo.js';

// 名前はすべて架空（リポジトリは公開）

// 版0（会社1件=事務所、氏名1欄、社員番号と部署を社員に直接持つ形）の DDL
const SCHEMA_V0 = `
  CREATE TABLE departments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE staff (
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
  CREATE INDEX staff_department_idx ON staff(department_id);
  CREATE TABLE office (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    name        TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    address     TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    fax         TEXT NOT NULL DEFAULT '',
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO office (id) VALUES (1);
  CREATE TABLE external_links (
    app         TEXT NOT NULL,
    entity      TEXT NOT NULL CHECK (entity IN ('staff', 'department')),
    external_id TEXT NOT NULL,
    local_id    INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (app, entity, external_id)
  );
`;

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

// 版0の DB をファイルに作り、seed で中身を入れてから openDb で開き直す（＝移行が走る）
function migrateFrom(seed: (d: Database.Database) => void): Database.Database {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staff-v0-'));
  dirs.push(dir);
  const file = path.join(dir, 'staff.sqlite');
  const v0 = new Database(file);
  v0.exec(SCHEMA_V0);
  seed(v0);
  v0.close();
  return openDb(file);
}

describe('版0からの移行', () => {
  it('事務所を会社 #1 に、部署・社員番号を主所属にする（台帳IDは変えない）', () => {
    const db = migrateFrom((d) => {
      d.exec(`
        UPDATE office SET name = '架空会計事務所', phone = '00-0000-0000' WHERE id = 1;
        INSERT INTO departments (id, name, sort_order) VALUES (3, '会計部', 1), (7, '資産税部', 2);
        INSERT INTO staff (id, employee_no, name, name_kana, department_id, retired_on) VALUES
          (5, 'A1', '山田 太郎', 'ヤマダ タロウ', 3, NULL),
          (9, NULL, '鈴木　花子', '', 7, '2026-03-31'),
          (12, NULL, '佐藤', 'サトウ', NULL, NULL);
      `);
    });
    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    expect(listCompanies(db).map((c) => [c.id, c.name, c.phone])).toEqual([[1, '架空会計事務所', '00-0000-0000']]);
    expect(listDepartments(db).map((d) => [d.id, d.companyId, d.name])).toEqual([
      [3, 1, '会計部'],
      [7, 1, '資産税部'],
    ]);

    const byId = new Map(listStaff(db, 'all').map((s) => [s.id, s]));
    expect(byId.get(5)).toMatchObject({
      familyName: '山田',
      givenName: '太郎',
      familyKana: 'ヤマダ',
      givenKana: 'タロウ',
      employeeNo: 'A1',
      departmentName: '会計部',
    });
    expect(byId.get(9)).toMatchObject({ familyName: '鈴木', givenName: '花子', retiredOn: '2026-03-31' });
    // 部署も社員番号も無い人は所属なし
    expect(byId.get(12)).toMatchObject({ familyName: '佐藤', givenName: '', familyKana: 'サトウ', affiliations: [] });
  });

  it('事務所名が空なら仮の会社名', () => {
    const db = migrateFrom(() => {});
    expect(listCompanies(db).map((c) => c.name)).toEqual([PLACEHOLDER_COMPANY_NAME]);
  });

  it('消した社員・部署の番号を新しいものに再利用しない', () => {
    const db = migrateFrom((d) => {
      d.exec(`
        INSERT INTO departments (id, name) VALUES (4, '旧部署');
        INSERT INTO staff (id, name) VALUES (20, '退職者');
        DELETE FROM staff; DELETE FROM departments;
      `);
    });
    expect(db.prepare(`INSERT INTO staff (family_name) VALUES ('新人')`).run().lastInsertRowid).toBe(21);
    expect(db.prepare(`INSERT INTO departments (company_id, name) VALUES (1, '新部署')`).run().lastInsertRowid).toBe(5);
  });

  it('移行済みの DB は開き直しても作り替えない', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staff-v1-'));
    dirs.push(dir);
    const file = path.join(dir, 'staff.sqlite');
    const first = openDb(file);
    first.prepare(`INSERT INTO staff (family_name) VALUES ('山田')`).run();
    first.close();
    const again = openDb(file);
    expect(listStaff(again, 'all')).toHaveLength(1);
    expect(listCompanies(again)).toHaveLength(1);
    again.close();
  });
});

describe('版1からの移行（住所・生年月日）', () => {
  it('社員はそのまま残り、住所・生年月日は空で足される', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staff-v1-'));
    dirs.push(dir);
    const file = path.join(dir, 'staff.sqlite');
    const v1 = new Database(file);
    v1.exec(SCHEMA_V1);
    v1.prepare(`INSERT INTO companies (name) VALUES ('架空商事')`).run();
    v1.prepare(
      `INSERT INTO staff (family_name, given_name, family_kana, mobile_phone, retired_on)
       VALUES ('山田', '太郎', 'ヤマダ', '090-0000-0000', NULL), ('佐藤', '', '', '', '2026-03-31')`,
    ).run();
    v1.prepare(`INSERT INTO staff_affiliations (staff_id, company_id, employee_no, is_primary) VALUES (1, 1, 'A001', 1)`).run();
    v1.pragma('user_version = 1');
    v1.close();

    const db = openDb(file);
    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    expect(getStaff(db, 1)).toMatchObject({
      fullName: '山田 太郎',
      familyKana: 'ヤマダ',
      mobilePhone: '090-0000-0000',
      employeeNo: 'A001',
      companyName: '架空商事',
    });
    expect(getStaff(db, 2)?.retiredOn).toBe('2026-03-31');
    expect(getStaffPersonal(db, 1)).toEqual({ id: 1, postalCode: '', address: '', birthDate: null });
    db.close();
  });
});
