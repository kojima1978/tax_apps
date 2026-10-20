// 社員台帳（staff-directory）→ 案件管理の部署・担当者への写し方を決める純粋関数。
// DB には触らず「何を作り・何を書き換えるか」だけを返す（適用は sync.ts）。
//
// 突き合わせの順番:
//   1. 台帳ID（staffDirectoryId）が入っている行
//   2. 台帳の取込記録（external_links, app='itcm'）で「案件管理の何番が台帳の何番か」
//   3. 部署だけ: 同じ名前の部署（台帳ID がまだ無いものに限る）
// 担当者は名前では結び付けない ── 苗字だけの登録が多く、同姓の別人を同じ人にしてしまう。
// どれにも当たらない台帳側の人・部署は新しく作る。台帳に居ない案件管理側の担当者は
// 触らずに「未連携」として返す（直すのは台帳側の取込 `npm run import:itcm`）。

export interface DirectoryDepartment {
  id: number;
  name: string;
  /**
   * 案件管理で使う名前。台帳は部署を会社ごとに持ち、同じ名前の部署が複数の会社にあれば
   * 「会社 部署」の形になる（案件管理の部署名は一意なので、名前のままだと衝突する）。
   * 会社の分かれる前の台帳は返さないので name に戻す
   */
  label?: string;
  sortOrder: number;
  active: boolean;
}

export interface DirectoryStaff {
  id: number;
  employeeNo: string | null;
  name: string;
  departmentId: number | null;
  retiredOn: string | null;
}

export interface DirectoryLink {
  entity: 'staff' | 'department';
  externalId: string;
  localId: number;
}

export interface LocalDepartment {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
  staffDirectoryId: number | null;
}

export interface LocalAssignee {
  id: number;
  name: string;
  employeeId: string | null;
  departmentId: number | null;
  active: boolean;
  staffDirectoryId: number | null;
}

export interface DepartmentData {
  name: string;
  sortOrder: number;
  active: boolean;
  staffDirectoryId: number;
}

export interface AssigneeData {
  name: string;
  employeeId: string | null;
  departmentId: number | null;
  active: boolean;
  staffDirectoryId: number;
}

export type SyncOp<T> = { kind: 'create'; data: T } | { kind: 'update'; id: number; data: Partial<T> };

/** 台帳ID → 案件管理の番号（取込記録から） */
function linkMap(links: DirectoryLink[], entity: DirectoryLink['entity']): Map<number, number> {
  const map = new Map<number, number>();
  for (const l of links) {
    const external = Number(l.externalId);
    if (l.entity === entity && Number.isInteger(external)) map.set(l.localId, external);
  }
  return map;
}

/** 値が変わる欄だけを残す（変わらない行は書かない＝updatedAt を動かさない） */
function changedFields<T extends object>(current: Partial<T>, next: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (current[key] !== next[key]) out[key] = next[key];
  }
  return out;
}

/**
 * 案件管理の行を台帳の行へ割り当てる。1つの案件管理の行は1人（1部署）にしか割り当てない。
 * fallback は台帳ID がまだ無い行の中から候補を返す（取込記録・名前）。
 */
function matchRows<L extends { id: number; staffDirectoryId: number | null }, D extends { id: number }>(
  local: L[],
  directory: D[],
  fallbacks: ((d: D, free: Map<number, L>) => L | undefined)[],
): Map<number, L> {
  const byDirectoryId = new Map(local.filter((l) => l.staffDirectoryId !== null).map((l) => [l.staffDirectoryId!, l]));
  const free = new Map(local.filter((l) => l.staffDirectoryId === null).map((l) => [l.id, l]));
  const matched = new Map<number, L>();
  for (const d of directory) {
    const hit = byDirectoryId.get(d.id);
    if (hit) matched.set(d.id, hit);
  }
  for (const fallback of fallbacks) {
    for (const d of directory) {
      if (matched.has(d.id)) continue;
      const hit = fallback(d, free);
      if (hit) {
        matched.set(d.id, hit);
        free.delete(hit.id);
      }
    }
  }
  return matched;
}

const nameOf = (d: DirectoryDepartment) => d.label ?? d.name;

export function planDepartments(
  directory: DirectoryDepartment[],
  links: DirectoryLink[],
  local: LocalDepartment[],
): SyncOp<DepartmentData>[] {
  const linked = linkMap(links, 'department');
  const matched = matchRows(local, directory, [
    (d, free) => free.get(linked.get(d.id) ?? -1),
    (d, free) => [...free.values()].find((l) => l.name === nameOf(d)),
  ]);

  const ops: SyncOp<DepartmentData>[] = [];
  for (const d of directory) {
    const next: DepartmentData = { name: nameOf(d), sortOrder: d.sortOrder, active: d.active, staffDirectoryId: d.id };
    const current = matched.get(d.id);
    if (!current) {
      ops.push({ kind: 'create', data: next });
      continue;
    }
    const data = changedFields<DepartmentData>(current as Partial<DepartmentData>, next);
    if (Object.keys(data).length > 0) ops.push({ kind: 'update', id: current.id, data });
  }

  // 台帳で消された部署（台帳ID はあるのに台帳に居ない）は使用停止にする。
  // 所属する担当者がいる部署は台帳側で消せないので、ここに来るのは空の部署だけ
  const directoryIds = new Set(directory.map((d) => d.id));
  for (const l of local) {
    if (l.staffDirectoryId !== null && !directoryIds.has(l.staffDirectoryId) && l.active) {
      ops.push({ kind: 'update', id: l.id, data: { active: false } });
    }
  }
  return ops;
}

/** departmentIdByDirectoryId は部署の同期を終えた後の「台帳の部署ID → 案件管理の部署ID」 */
export function planAssignees(
  directory: DirectoryStaff[],
  links: DirectoryLink[],
  local: LocalAssignee[],
  departmentIdByDirectoryId: Map<number, number>,
): SyncOp<AssigneeData>[] {
  const linked = linkMap(links, 'staff');
  const matched = matchRows(local, directory, [(d, free) => free.get(linked.get(d.id) ?? -1)]);

  const ops: SyncOp<AssigneeData>[] = [];
  for (const s of directory) {
    const next: AssigneeData = {
      name: s.name,
      employeeId: s.employeeNo,
      departmentId: s.departmentId === null ? null : (departmentIdByDirectoryId.get(s.departmentId) ?? null),
      active: s.retiredOn === null,
      staffDirectoryId: s.id,
    };
    const current = matched.get(s.id);
    if (!current) {
      ops.push({ kind: 'create', data: next });
      continue;
    }
    const data = changedFields<AssigneeData>(current as Partial<AssigneeData>, next);
    if (Object.keys(data).length > 0) ops.push({ kind: 'update', id: current.id, data });
  }
  return ops;
}
