import type Database from 'better-sqlite3';
import type { DepartmentInput, OfficeInput, StaffInput } from './normalize.js';

// API の応答の形。各アプリが読むのはこの形なので、列名を変えるときはここだけで吸収する。
export type Staff = {
  id: number;
  employeeNo: string | null;
  name: string;
  nameKana: string;
  departmentId: number | null;
  departmentName: string | null;
  mobilePhone: string;
  retiredOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Department = {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
  staffCount: number;
};

export type Office = OfficeInput & { updatedAt: string };

export type StaffStatus = 'active' | 'retired' | 'all';

type StaffRow = {
  id: number;
  employee_no: string | null;
  name: string;
  name_kana: string;
  department_id: number | null;
  department_name: string | null;
  mobile_phone: string;
  retired_on: string | null;
  created_at: string;
  updated_at: string;
};

const toStaff = (r: StaffRow): Staff => ({
  id: r.id,
  employeeNo: r.employee_no,
  name: r.name,
  nameKana: r.name_kana,
  departmentId: r.department_id,
  departmentName: r.department_name,
  mobilePhone: r.mobile_phone,
  retiredOn: r.retired_on,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const STAFF_SELECT = `
  SELECT s.*, d.name AS department_name
  FROM staff s LEFT JOIN departments d ON d.id = s.department_id
`;

// 退職は「退職日を過ぎたか」ではなく「退職日が入っているか」で判定する
// （各アプリに日付の比較を持たせない）。退職日は辞めた後に入れる運用。
const STATUS_WHERE: Record<StaffStatus, string> = {
  active: 'WHERE s.retired_on IS NULL',
  retired: 'WHERE s.retired_on IS NOT NULL',
  all: '',
};

// フリガナの無い人は最後にまとめる（未入力が一目で分かるように）。
// 保存時にカタカナへ揃えてあるので、文字コード順でそのまま五十音順になる。
const STAFF_ORDER = `ORDER BY s.name_kana = '', s.name_kana, s.id`;

export function listStaff(db: Database.Database, status: StaffStatus): Staff[] {
  const rows = db
    .prepare(`${STAFF_SELECT} ${STATUS_WHERE[status]} ${STAFF_ORDER}`)
    .all() as StaffRow[];
  return rows.map(toStaff);
}

export function getStaff(db: Database.Database, id: number): Staff | null {
  const row = db.prepare(`${STAFF_SELECT} WHERE s.id = ?`).get(id) as StaffRow | undefined;
  return row ? toStaff(row) : null;
}

export class ConflictError extends Error {}

// UNIQUE / FOREIGN KEY 違反を画面に出せる言葉へ置き換える
function translateConstraint(err: unknown, input: StaffInput): never {
  const code = (err as { code?: string }).code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new ConflictError(`社員番号「${input.employeeNo}」は既に使われています`);
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    throw new ConflictError('指定した部署が見つかりません');
  }
  throw err;
}

export function createStaff(db: Database.Database, input: StaffInput): Staff {
  try {
    const info = db
      .prepare(
        `INSERT INTO staff (employee_no, name, name_kana, department_id, mobile_phone, retired_on)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.employeeNo, input.name, input.nameKana, input.departmentId, input.mobilePhone, input.retiredOn);
    return getStaff(db, Number(info.lastInsertRowid))!;
  } catch (err) {
    translateConstraint(err, input);
  }
}

export function updateStaff(db: Database.Database, id: number, input: StaffInput): Staff | null {
  try {
    const info = db
      .prepare(
        `UPDATE staff SET employee_no = ?, name = ?, name_kana = ?, department_id = ?,
           mobile_phone = ?, retired_on = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(input.employeeNo, input.name, input.nameKana, input.departmentId, input.mobilePhone, input.retiredOn, id);
    return info.changes === 0 ? null : getStaff(db, id);
  } catch (err) {
    translateConstraint(err, input);
  }
}

type DepartmentRow = { id: number; name: string; sort_order: number; active: number; staff_count: number };

export function listDepartments(db: Database.Database): Department[] {
  const rows = db
    .prepare(
      `SELECT d.*, (SELECT count(*) FROM staff s WHERE s.department_id = d.id AND s.retired_on IS NULL) AS staff_count
       FROM departments d ORDER BY d.sort_order, d.id`,
    )
    .all() as DepartmentRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
    active: r.active === 1,
    staffCount: r.staff_count,
  }));
}

function departmentNameConflict(err: unknown, name: string): never {
  if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new ConflictError(`部署「${name}」は既にあります`);
  }
  throw err;
}

export function createDepartment(db: Database.Database, input: DepartmentInput): number {
  try {
    const info = db
      .prepare('INSERT INTO departments (name, sort_order, active) VALUES (?, ?, ?)')
      .run(input.name, input.sortOrder, input.active ? 1 : 0);
    return Number(info.lastInsertRowid);
  } catch (err) {
    departmentNameConflict(err, input.name);
  }
}

export function updateDepartment(db: Database.Database, id: number, input: DepartmentInput): boolean {
  try {
    const info = db
      .prepare(
        `UPDATE departments SET name = ?, sort_order = ?, active = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(input.name, input.sortOrder, input.active ? 1 : 0, id);
    return info.changes > 0;
  } catch (err) {
    departmentNameConflict(err, input.name);
  }
}

// 退職者も含めて誰かが所属している部署は消せない（退職者の記録から部署名が消えるため）。
// 使わなくなった部署は「使用停止」にする。
export function deleteDepartment(db: Database.Database, id: number): boolean {
  const used = db.prepare('SELECT count(*) AS n FROM staff WHERE department_id = ?').get(id) as { n: number };
  if (used.n > 0) {
    throw new ConflictError(`所属している社員が${used.n}名いるため削除できません。使用停止にしてください`);
  }
  return db.transaction(() => {
    db.prepare(`DELETE FROM external_links WHERE entity = 'department' AND local_id = ?`).run(id);
    return db.prepare('DELETE FROM departments WHERE id = ?').run(id).changes > 0;
  })();
}

type OfficeRow = { name: string; postal_code: string; address: string; phone: string; fax: string; updated_at: string };

export function getOffice(db: Database.Database): Office {
  const r = db.prepare('SELECT * FROM office WHERE id = 1').get() as OfficeRow;
  return {
    name: r.name,
    postalCode: r.postal_code,
    address: r.address,
    phone: r.phone,
    fax: r.fax,
    updatedAt: r.updated_at,
  };
}

export function updateOffice(db: Database.Database, input: OfficeInput): Office {
  db.prepare(
    `UPDATE office SET name = ?, postal_code = ?, address = ?, phone = ?, fax = ?, updated_at = datetime('now')
     WHERE id = 1`,
  ).run(input.name, input.postalCode, input.address, input.phone, input.fax);
  return getOffice(db);
}

export interface ExternalLink {
  entity: 'staff' | 'department';
  externalId: string;
  localId: number;
}

// 他アプリが「自分の何番が台帳の何番か」を引くための一覧。取込で作った対応を
// そのまま返すだけで、名前での突き合わせはしない
export function listLinks(db: Database.Database, app: string): ExternalLink[] {
  return db
    .prepare(
      `SELECT entity, external_id AS externalId, local_id AS localId
       FROM external_links WHERE app = ? ORDER BY entity, local_id`,
    )
    .all(app) as ExternalLink[];
}
