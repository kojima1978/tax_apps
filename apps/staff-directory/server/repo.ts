import type Database from 'better-sqlite3';
import type { AffiliationInput, CompanyInput, DepartmentInput, StaffInput, StaffPersonalInput } from './normalize.js';

// API の応答の形。各アプリが読むのはこの形なので、列名を変えるときはここだけで吸収する。

export type Affiliation = {
  companyId: number;
  companyName: string;
  departmentId: number | null;
  departmentName: string | null;
  employeeNo: string | null;
  isPrimary: boolean;
};

export type Staff = {
  id: number;
  familyName: string;
  givenName: string;
  familyKana: string;
  givenKana: string;
  /** 「姓 名」。名が空なら姓だけ */
  fullName: string;
  /** 狭い欄に出す名前。手で決めた略称があればそれ、無ければ autoShortName */
  shortName: string;
  /** 手で決めた略称。空なら自動 */
  customShortName: string;
  /** 自動の略称。ふだんは姓だけで、在籍中に同じ姓の人がいれば名の頭を足す（山田太 / 山田花） */
  autoShortName: string;
  /** shortName と同じ。案件管理・PB が読む旧い名前の欄 */
  name: string;
  /** 「セイ メイ」。PB が読む旧い欄 */
  nameKana: string;
  affiliations: Affiliation[];
  // 以下5つは主所属の写し。所属が1つだった頃の形のまま読む各アプリのために残す
  employeeNo: string | null;
  companyId: number | null;
  companyName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  mobilePhone: string;
  retiredOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Company = CompanyInput & {
  id: number;
  departmentCount: number;
  /** 所属している在籍者の数（主所属に限らない） */
  staffCount: number;
  updatedAt: string;
};

export type Department = {
  id: number;
  companyId: number;
  companyName: string;
  name: string;
  /** 部署名。同じ名前の部署が別の会社にもあるときだけ「会社 部署」にする（案件管理は部署名を一意に持つため） */
  label: string;
  sortOrder: number;
  active: boolean;
  staffCount: number;
};

export type StaffStatus = 'active' | 'retired' | 'all';

export class ConflictError extends Error {}

const isConstraint = (err: unknown, kind: 'UNIQUE' | 'FOREIGNKEY') =>
  (err as { code?: string }).code === `SQLITE_CONSTRAINT_${kind}`;

// ---- 社員 ----

type StaffRow = {
  id: number;
  family_name: string;
  given_name: string;
  family_kana: string;
  given_kana: string;
  short_name: string;
  mobile_phone: string;
  retired_on: string | null;
  created_at: string;
  updated_at: string;
};

type AffiliationRow = {
  staff_id: number;
  company_id: number;
  company_name: string;
  department_id: number | null;
  department_name: string | null;
  employee_no: string | null;
  is_primary: number;
};

const joinName = (a: string, b: string) => (b === '' ? a : `${a} ${b}`);

/**
 * 略称。同じ姓の在籍者（自分を除く）がいなければ姓だけ。いれば、名の頭を1文字ずつ伸ばして
 * 誰とも重ならなくなったところで止める（太郎 / 太一 なら「山田太郎」「山田太一」）。
 * 退職者も在籍者とだけ比べる ── 退職者同士で区別のために表示が伸びても、誰も得をしないため。
 */
export function shortNameOf(
  self: { id: number; familyName: string; givenName: string },
  active: { id: number; familyName: string; givenName: string }[],
): string {
  const given = Array.from(self.givenName);
  if (given.length === 0) return self.familyName;
  const peers = active
    .filter((p) => p.id !== self.id && p.familyName === self.familyName)
    .map((p) => Array.from(p.givenName));
  if (peers.length === 0) return self.familyName;
  for (let k = 1; k <= given.length; k++) {
    const head = given.slice(0, k).join('');
    if (peers.every((p) => p.slice(0, k).join('') !== head)) return self.familyName + head;
  }
  return self.familyName + self.givenName;
}

// 退職は「退職日を過ぎたか」ではなく「退職日が入っているか」で判定する
// （各アプリに日付の比較を持たせない）。退職日は辞めた後に入れる運用。
const STATUS_WHERE: Record<StaffStatus, string> = {
  active: 'WHERE s.retired_on IS NULL',
  retired: 'WHERE s.retired_on IS NOT NULL',
  all: '',
};

// フリガナの無い人は最後にまとめる（未入力が一目で分かるように）。
// 保存時にカタカナへ揃えてあるので、文字コード順でそのまま五十音順になる。
const STAFF_ORDER = `ORDER BY s.family_kana = '', s.family_kana, s.given_kana, s.id`;

function loadStaff(db: Database.Database, where: string, params: unknown[] = []): Staff[] {
  const rows = db.prepare(`SELECT s.* FROM staff s ${where} ${STAFF_ORDER}`).all(...params) as StaffRow[];
  if (rows.length === 0) return [];

  const active = (
    db.prepare('SELECT id, family_name, given_name FROM staff WHERE retired_on IS NULL').all() as Pick<
      StaffRow,
      'id' | 'family_name' | 'given_name'
    >[]
  ).map((r) => ({ id: r.id, familyName: r.family_name, givenName: r.given_name }));

  // 主所属を先頭に、残りは会社の表示順
  const affiliations = new Map<number, Affiliation[]>();
  const affRows = db
    .prepare(
      `SELECT a.staff_id, a.company_id, c.name AS company_name, a.department_id, d.name AS department_name,
              a.employee_no, a.is_primary
       FROM staff_affiliations a
       JOIN companies c ON c.id = a.company_id
       LEFT JOIN departments d ON d.id = a.department_id
       ORDER BY a.staff_id, a.is_primary DESC, c.sort_order, c.id`,
    )
    .all() as AffiliationRow[];
  for (const a of affRows) {
    const list = affiliations.get(a.staff_id) ?? [];
    list.push({
      companyId: a.company_id,
      companyName: a.company_name,
      departmentId: a.department_id,
      departmentName: a.department_name,
      employeeNo: a.employee_no,
      isPrimary: a.is_primary === 1,
    });
    affiliations.set(a.staff_id, list);
  }

  return rows.map((r) => {
    const affs = affiliations.get(r.id) ?? [];
    const primary = affs.find((a) => a.isPrimary) ?? null;
    const autoShortName = shortNameOf({ id: r.id, familyName: r.family_name, givenName: r.given_name }, active);
    const shortName = r.short_name || autoShortName;
    return {
      id: r.id,
      familyName: r.family_name,
      givenName: r.given_name,
      familyKana: r.family_kana,
      givenKana: r.given_kana,
      fullName: joinName(r.family_name, r.given_name),
      shortName,
      customShortName: r.short_name,
      autoShortName,
      name: shortName,
      nameKana: joinName(r.family_kana, r.given_kana),
      affiliations: affs,
      employeeNo: primary?.employeeNo ?? null,
      companyId: primary?.companyId ?? null,
      companyName: primary?.companyName ?? null,
      departmentId: primary?.departmentId ?? null,
      departmentName: primary?.departmentName ?? null,
      mobilePhone: r.mobile_phone,
      retiredOn: r.retired_on,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

export function listStaff(db: Database.Database, status: StaffStatus): Staff[] {
  return loadStaff(db, STATUS_WHERE[status]);
}

export function getStaff(db: Database.Database, id: number): Staff | null {
  return loadStaff(db, 'WHERE s.id = ?', [id])[0] ?? null;
}

// 所属は丸ごと入れ替える。会社・部署の取り違えは複合外部キーでも弾かれるが、
// それだと「どれが」が言えないので先に1件ずつ確かめる
function writeAffiliations(db: Database.Database, staffId: number, affiliations: AffiliationInput[]): void {
  db.prepare('DELETE FROM staff_affiliations WHERE staff_id = ?').run(staffId);
  const company = db.prepare('SELECT name FROM companies WHERE id = ?');
  const department = db.prepare('SELECT name, company_id FROM departments WHERE id = ?');
  const insert = db.prepare(
    `INSERT INTO staff_affiliations (staff_id, company_id, department_id, employee_no, is_primary)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const a of affiliations) {
    const c = company.get(a.companyId) as { name: string } | undefined;
    if (!c) throw new ConflictError('指定した会社が見つかりません');
    if (a.departmentId !== null) {
      const d = department.get(a.departmentId) as { name: string; company_id: number } | undefined;
      if (!d) throw new ConflictError('指定した部署が見つかりません');
      if (d.company_id !== a.companyId) throw new ConflictError(`部署「${d.name}」は${c.name}の部署ではありません`);
    }
    try {
      insert.run(staffId, a.companyId, a.departmentId, a.employeeNo, a.isPrimary ? 1 : 0);
    } catch (err) {
      if (isConstraint(err, 'UNIQUE')) {
        throw new ConflictError(`${c.name}で社員番号「${a.employeeNo}」は既に使われています`);
      }
      throw err;
    }
  }
}

export function createStaff(db: Database.Database, input: StaffInput): Staff {
  const id = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO staff (family_name, given_name, family_kana, given_kana, mobile_phone, retired_on)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.familyName, input.givenName, input.familyKana, input.givenKana, input.mobilePhone, input.retiredOn);
    const staffId = Number(info.lastInsertRowid);
    writeAffiliations(db, staffId, input.affiliations);
    return staffId;
  })();
  return getStaff(db, id)!;
}

export function updateStaff(db: Database.Database, id: number, input: StaffInput): Staff | null {
  const found = db.transaction(() => {
    const info = db
      .prepare(
        `UPDATE staff SET family_name = ?, given_name = ?, family_kana = ?, given_kana = ?,
           mobile_phone = ?, retired_on = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(input.familyName, input.givenName, input.familyKana, input.givenKana, input.mobilePhone, input.retiredOn, id);
    if (info.changes === 0) return false;
    writeAffiliations(db, id, input.affiliations);
    return true;
  })();
  return found ? getStaff(db, id) : null;
}

// 略称だけを書き換える（編集画面が社員の保存の後に呼ぶ）。社員の PUT には含めない ──
// 他アプリの取込や古い画面が PUT /staff/:id を送っても、手で決めた略称が消えないように。空は自動に戻す
export function updateStaffShortName(db: Database.Database, id: number, shortName: string): Staff | null {
  const info = db.prepare(`UPDATE staff SET short_name = ?, updated_at = datetime('now') WHERE id = ?`).run(shortName, id);
  return info.changes === 0 ? null : getStaff(db, id);
}

// ---- 社員の個人情報 ----
// 住所・生年月日は一覧・詳細（＝他アプリが写しの同期で丸ごと読む形）に混ぜない。
// 台帳の編集画面と、他アプリが1人分を必要としたときに /staff/:id/personal から読む。
// ログインを足すときはこの口だけを絞ればよいように分けてある

export type StaffPersonal = StaffPersonalInput & { id: number };

type StaffPersonalRow = { id: number; postal_code: string; address: string; birth_date: string | null };

export function getStaffPersonal(db: Database.Database, id: number): StaffPersonal | null {
  const r = db.prepare('SELECT id, postal_code, address, birth_date FROM staff WHERE id = ?').get(id) as
    | StaffPersonalRow
    | undefined;
  return r ? { id: r.id, postalCode: r.postal_code, address: r.address, birthDate: r.birth_date } : null;
}

export function updateStaffPersonal(db: Database.Database, id: number, input: StaffPersonalInput): StaffPersonal | null {
  const info = db
    .prepare(
      `UPDATE staff SET postal_code = ?, address = ?, birth_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(input.postalCode, input.address, input.birthDate, id);
  return info.changes === 0 ? null : getStaffPersonal(db, id);
}

// ---- 会社 ----

type CompanyRow = {
  id: number;
  name: string;
  short_name: string;
  postal_code: string;
  address: string;
  phone: string;
  fax: string;
  representative: string;
  sort_order: number;
  updated_at: string;
  department_count: number;
  staff_count: number;
};

export function listCompanies(db: Database.Database): Company[] {
  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT count(*) FROM departments d WHERE d.company_id = c.id) AS department_count,
         (SELECT count(*) FROM staff_affiliations a JOIN staff s ON s.id = a.staff_id
          WHERE a.company_id = c.id AND s.retired_on IS NULL) AS staff_count
       FROM companies c ORDER BY c.sort_order, c.id`,
    )
    .all() as CompanyRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    shortName: r.short_name,
    postalCode: r.postal_code,
    address: r.address,
    phone: r.phone,
    fax: r.fax,
    representative: r.representative,
    sortOrder: r.sort_order,
    departmentCount: r.department_count,
    staffCount: r.staff_count,
    updatedAt: r.updated_at,
  }));
}

function companyNameConflict(err: unknown, name: string): never {
  if (isConstraint(err, 'UNIQUE')) throw new ConflictError(`会社「${name}」は既にあります`);
  throw err;
}

export function createCompany(db: Database.Database, input: CompanyInput): number {
  try {
    const info = db
      .prepare(
        `INSERT INTO companies (name, short_name, postal_code, address, phone, fax, representative, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.name, input.shortName, input.postalCode, input.address, input.phone, input.fax, input.representative, input.sortOrder);
    return Number(info.lastInsertRowid);
  } catch (err) {
    companyNameConflict(err, input.name);
  }
}

export function updateCompany(db: Database.Database, id: number, input: CompanyInput): boolean {
  try {
    const info = db
      .prepare(
        `UPDATE companies SET name = ?, short_name = ?, postal_code = ?, address = ?, phone = ?, fax = ?, representative = ?,
           sort_order = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(input.name, input.shortName, input.postalCode, input.address, input.phone, input.fax, input.representative, input.sortOrder, id);
    return info.changes > 0;
  } catch (err) {
    companyNameConflict(err, input.name);
  }
}

// 部署か所属（退職者も含む）が残っている会社は消せない。先にそちらを片付けてもらう
export function deleteCompany(db: Database.Database, id: number): boolean {
  const { departments, members } = db
    .prepare(
      `SELECT (SELECT count(*) FROM departments WHERE company_id = ?) AS departments,
              (SELECT count(*) FROM staff_affiliations WHERE company_id = ?) AS members`,
    )
    .get(id, id) as { departments: number; members: number };
  if (members > 0) throw new ConflictError(`所属している社員が${members}名いるため削除できません`);
  if (departments > 0) throw new ConflictError(`部署が${departments}件あるため削除できません。先に部署を削除してください`);
  return db.prepare('DELETE FROM companies WHERE id = ?').run(id).changes > 0;
}

// ---- 部署 ----

type DepartmentRow = {
  id: number;
  company_id: number;
  company_name: string;
  company_short_name: string;
  name: string;
  sort_order: number;
  active: number;
  staff_count: number;
};

export function listDepartments(db: Database.Database): Department[] {
  const rows = db
    .prepare(
      `SELECT d.*, c.name AS company_name, c.short_name AS company_short_name,
         (SELECT count(*) FROM staff_affiliations a JOIN staff s ON s.id = a.staff_id
          WHERE a.department_id = d.id AND s.retired_on IS NULL) AS staff_count
       FROM departments d JOIN companies c ON c.id = d.company_id
       ORDER BY c.sort_order, c.id, d.sort_order, d.id`,
    )
    .all() as DepartmentRow[];
  const companiesByName = new Map<string, Set<number>>();
  for (const r of rows) companiesByName.set(r.name, (companiesByName.get(r.name) ?? new Set()).add(r.company_id));
  return rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    companyName: r.company_name,
    name: r.name,
    label:
      companiesByName.get(r.name)!.size > 1 ? `${r.company_short_name || r.company_name} ${r.name}` : r.name,
    sortOrder: r.sort_order,
    active: r.active === 1,
    staffCount: r.staff_count,
  }));
}

function departmentConflict(db: Database.Database, err: unknown, companyId: number | null, name: string): never {
  if (isConstraint(err, 'UNIQUE')) {
    const c = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId) as { name: string } | undefined;
    throw new ConflictError(`${c?.name ?? ''}に部署「${name}」は既にあります`);
  }
  if (isConstraint(err, 'FOREIGNKEY')) throw new ConflictError('指定した会社が見つかりません');
  throw err;
}

export function createDepartment(db: Database.Database, input: DepartmentInput & { companyId: number }): number {
  try {
    const info = db
      .prepare('INSERT INTO departments (company_id, name, sort_order, active) VALUES (?, ?, ?, ?)')
      .run(input.companyId, input.name, input.sortOrder, input.active ? 1 : 0);
    return Number(info.lastInsertRowid);
  } catch (err) {
    departmentConflict(db, err, input.companyId, input.name);
  }
}

// 会社は変えない（所属している人の会社と食い違うため。移すなら新しい部署を作って付け替える）
export function updateDepartment(db: Database.Database, id: number, input: DepartmentInput): boolean {
  try {
    const info = db
      .prepare(
        `UPDATE departments SET name = ?, sort_order = ?, active = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(input.name, input.sortOrder, input.active ? 1 : 0, id);
    return info.changes > 0;
  } catch (err) {
    const row = db.prepare('SELECT company_id FROM departments WHERE id = ?').get(id) as { company_id: number } | undefined;
    departmentConflict(db, err, row?.company_id ?? null, input.name);
  }
}

// 退職者も含めて誰かが所属している部署は消せない（退職者の記録から部署名が消えるため）。
// 使わなくなった部署は「使用停止」にする。
export function deleteDepartment(db: Database.Database, id: number): boolean {
  const used = db.prepare('SELECT count(*) AS n FROM staff_affiliations WHERE department_id = ?').get(id) as { n: number };
  if (used.n > 0) {
    throw new ConflictError(`所属している社員が${used.n}名いるため削除できません。使用停止にしてください`);
  }
  return db.transaction(() => {
    db.prepare(`DELETE FROM external_links WHERE entity = 'department' AND local_id = ?`).run(id);
    return db.prepare('DELETE FROM departments WHERE id = ?').run(id).changes > 0;
  })();
}

// ---- 他アプリとの対応 ----

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
