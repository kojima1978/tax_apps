import type Database from 'better-sqlite3';

// 案件管理（itcm）の担当者・部署を台帳へ取り込む。
//
// 何度流しても同じ人を二重に作らない: 取り込んだものは external_links に
// itcm 側の id と台帳の id の対で残し、次からは「取込済み」として読み飛ばす。
// 取込済みの人は台帳側で直した内容（フリガナ・携帯・退職日…）を上書きしない ──
// 取込は「最初に台帳へ入れる口」で、以降の正は台帳にある。
//
// 名前だけで既存の人と結び付けることはしない。itcm の名前は姓だけ（「三河」）なので、
// 同姓の別人を同じ人として扱う危険のほうが大きい。同名が台帳に既にいれば
// 一覧に注意を出すだけで、新しく作る。部署は名前が一意なので名前で結び付ける。

export const ITCM_APP = 'itcm';

export type ItcmDepartment = { id: number; name: string; sortOrder: number; active: boolean };
export type ItcmAssignee = {
  id: number;
  name: string;
  employeeId: string | null;
  departmentId: number | null;
  active: boolean;
  updatedAt: string;
};

export type DepartmentPlan =
  | { action: 'create'; source: ItcmDepartment }
  | { action: 'link'; source: ItcmDepartment; localId: number }
  | { action: 'skip'; source: ItcmDepartment; localId: number };

export type StaffPlan =
  | { action: 'create'; source: ItcmAssignee; employeeNo: string | null; retiredOn: string | null; notes: string[] }
  | { action: 'skip'; source: ItcmAssignee; localId: number };

export type ImportPlan = { departments: DepartmentPlan[]; staff: StaffPlan[] };

function linkedId(db: Database.Database, entity: 'staff' | 'department', externalId: number): number | null {
  const row = db
    .prepare('SELECT local_id FROM external_links WHERE app = ? AND entity = ? AND external_id = ?')
    .get(ITCM_APP, entity, String(externalId)) as { local_id: number } | undefined;
  return row?.local_id ?? null;
}

// itcm の updatedAt（UTC）を日本の日付にする。使われなくなった担当者の退職日の代わり
// （itcm には退職日が無く、使用停止にした日がいちばん近い）。
export function jstDate(iso: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function planItcmImport(
  db: Database.Database,
  departments: ItcmDepartment[],
  assignees: ItcmAssignee[],
): ImportPlan {
  const deptPlans: DepartmentPlan[] = departments.map((source) => {
    const linked = linkedId(db, 'department', source.id);
    if (linked !== null) return { action: 'skip', source, localId: linked };
    const byName = db.prepare('SELECT id FROM departments WHERE name = ?').get(source.name) as
      | { id: number }
      | undefined;
    return byName ? { action: 'link', source, localId: byName.id } : { action: 'create', source };
  });

  const nameCount = db.prepare('SELECT count(*) AS n FROM staff WHERE name = ?');
  const employeeNoUsed = db.prepare('SELECT 1 FROM staff WHERE employee_no = ?');
  // 取込の中で同じ社員番号が2人に付いていたら、2人目以降は空にする（台帳では重複不可）
  const takenInBatch = new Set<string>();

  const staffPlans: StaffPlan[] = assignees.map((source) => {
    const linked = linkedId(db, 'staff', source.id);
    if (linked !== null) return { action: 'skip', source, localId: linked };

    const notes: string[] = [];
    let employeeNo = source.employeeId?.trim() || null;
    if (employeeNo !== null && (employeeNoUsed.get(employeeNo) || takenInBatch.has(employeeNo))) {
      notes.push(`社員番号「${employeeNo}」は使用済みのため空で登録`);
      employeeNo = null;
    }
    if (employeeNo !== null) takenInBatch.add(employeeNo);
    if ((nameCount.get(source.name) as { n: number }).n > 0) {
      notes.push('台帳に同じ名前の人がいます（別人として登録）');
    }
    const retiredOn = source.active ? null : jstDate(source.updatedAt);
    return { action: 'create', source, employeeNo, retiredOn, notes };
  });

  return { departments: deptPlans, staff: staffPlans };
}

export type ImportResult = { departmentsCreated: number; departmentsLinked: number; staffCreated: number };

// 計画をそのまま反映する。全体を1つのトランザクションで行い、途中で失敗したら何も残さない。
export function applyItcmImport(db: Database.Database, plan: ImportPlan): ImportResult {
  const insertLink = db.prepare(
    'INSERT INTO external_links (app, entity, external_id, local_id) VALUES (?, ?, ?, ?)',
  );
  const insertDept = db.prepare('INSERT INTO departments (name, sort_order, active) VALUES (?, ?, ?)');
  const insertStaff = db.prepare(
    'INSERT INTO staff (employee_no, name, department_id, retired_on) VALUES (?, ?, ?, ?)',
  );

  return db.transaction(() => {
    const result: ImportResult = { departmentsCreated: 0, departmentsLinked: 0, staffCreated: 0 };
    // itcm の部署 id → 台帳の部署 id（取込済みのものも含める。担当者の所属を引くため）
    const deptMap = new Map<number, number>();

    for (const p of plan.departments) {
      let localId: number;
      if (p.action === 'create') {
        localId = Number(insertDept.run(p.source.name, p.source.sortOrder, p.source.active ? 1 : 0).lastInsertRowid);
        result.departmentsCreated++;
      } else {
        localId = p.localId;
      }
      if (p.action !== 'skip') {
        insertLink.run(ITCM_APP, 'department', String(p.source.id), localId);
        if (p.action === 'link') result.departmentsLinked++;
      }
      deptMap.set(p.source.id, localId);
    }

    for (const p of plan.staff) {
      if (p.action !== 'create') continue;
      const deptId = p.source.departmentId === null ? null : (deptMap.get(p.source.departmentId) ?? null);
      const localId = Number(insertStaff.run(p.employeeNo, p.source.name, deptId, p.retiredOn).lastInsertRowid);
      insertLink.run(ITCM_APP, 'staff', String(p.source.id), localId);
      result.staffCreated++;
    }
    return result;
  })();
}
