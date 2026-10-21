// 社員台帳（staff-directory）→ 担当者（Staff）への写し方を決める純粋関数。
// DB には触らず「何を作り・何を書き換えるか」だけを返す（適用は sync.ts）。
//
// 結び付けは台帳ID（staffDirectoryId）だけ。名前では結び付けない ── 苗字だけの登録が多く、
// 同姓の別人を同じ人にしてしまう。台帳に居ない担当者（台帳ID の無い行）は「未連携」として
// 選択の候補から外す（isActive=false）。担当していた顧客の表示はそのまま残る。

export interface DirectoryStaff {
  id: number;
  employeeNo: string | null;
  name: string;
  nameKana: string | null;
  departmentName: string | null;
  retiredOn: string | null;
}

export interface LocalStaff {
  id: number;
  staffCode: string;
  name: string;
  nameKana: string;
  department: string;
  isActive: boolean;
  staffDirectoryId: number | null;
}

export interface StaffData {
  staffCode: string;
  name: string;
  nameKana: string;
  department: string;
  isActive: boolean;
  staffDirectoryId: number;
}

export type SyncOp<T> = { kind: "create"; data: T } | { kind: "update"; id: number; data: Partial<T> };

/** 担当者コードは社員番号。まだ無い人（今は全員）は台帳ID から作り、番号が入れば切り替わる */
export const directoryStaffCode = (staff: Pick<DirectoryStaff, "id" | "employeeNo">) => staff.employeeNo?.trim() || `SD-${staff.id}`;

/**
 * 台帳の人ごとの担当者コード。社員番号は台帳では会社ごとの一意なので、別の会社の人と重なりうる
 * （関連会社がそれぞれ 001 から振るなど）。PB のコードは全体で一意なので、重なった番号を持つ人は
 * 全員 `SD-<台帳ID>` へ逃がす ── 片方だけ番号のままにすると、どちらが番号を得るかが並び順で決まる。
 * 台帳に居ない担当者（未連携の行は残る）が同じコードを持つ場合も同じ扱い。
 */
export function directoryStaffCodes(directory: DirectoryStaff[], local: LocalStaff[]): Map<number, string> {
  const unlinkedCodes = new Set(local.filter((row) => row.staffDirectoryId === null).map((row) => row.staffCode));
  const users = new Map<string, number>();
  for (const staff of directory) {
    const code = directoryStaffCode(staff);
    users.set(code, (users.get(code) ?? 0) + 1);
  }
  return new Map(
    directory.map((staff) => {
      const code = directoryStaffCode(staff);
      return [staff.id, users.get(code)! > 1 || unlinkedCodes.has(code) ? `SD-${staff.id}` : code];
    }),
  );
}

/** 値が変わる欄だけを残す（変わらない行は書かない＝updatedAt を動かさない） */
function changedFields<T extends object>(current: { [K in keyof T]?: unknown }, next: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (current[key] !== next[key]) out[key] = next[key];
  }
  return out;
}

export interface StaffPlan {
  ops: SyncOp<StaffData>[];
  /** 担当者コードがぶつかって写せない理由。1件でもあれば何も書かない（逃がした後の `SD-<台帳ID>` まで重なったときだけ） */
  conflicts: string[];
}

export function planStaff(directory: DirectoryStaff[], local: LocalStaff[]): StaffPlan {
  const byDirectoryId = new Map(local.filter((row) => row.staffDirectoryId !== null).map((row) => [row.staffDirectoryId!, row]));
  const ops: SyncOp<StaffData>[] = [];
  const conflicts: string[] = [];

  // 写した後に担当者コードを持つのは「台帳の人」と「未連携のまま残る行」。ここで重なると一意制約で落ちる。
  // 重なる番号は directoryStaffCodes が逃がしてあるので、残るのは誰かの社員番号が「SD-5」のような形の場合だけ
  const codes = directoryStaffCodes(directory, local);
  const unlinkedCodes = new Map(local.filter((row) => row.staffDirectoryId === null).map((row) => [row.staffCode, row]));
  const claimed = new Map<string, DirectoryStaff>();
  for (const staff of directory) {
    const code = codes.get(staff.id)!;
    const other = claimed.get(code);
    if (other) conflicts.push(`社員番号「${code}」が台帳の${other.name}と${staff.name}で重なっています`);
    claimed.set(code, staff);
    const unlinked = unlinkedCodes.get(code);
    if (unlinked) conflicts.push(`担当者コード「${code}」を台帳に無い担当者（${unlinked.name}）が使っています`);
  }

  for (const staff of directory) {
    const next: StaffData = {
      staffCode: codes.get(staff.id)!,
      name: staff.name,
      nameKana: staff.nameKana ?? "",
      department: staff.departmentName ?? "",
      isActive: staff.retiredOn === null,
      staffDirectoryId: staff.id,
    };
    const current = byDirectoryId.get(staff.id);
    if (!current) {
      ops.push({ kind: "create", data: next });
      continue;
    }
    const data = changedFields<StaffData>(current, next);
    if (Object.keys(data).length > 0) ops.push({ kind: "update", id: current.id, data });
  }

  // 台帳に居ない担当者は選べないようにする（消しはしない。担当していた顧客の表示が残るように）
  for (const row of local) {
    if (row.staffDirectoryId === null && row.isActive) ops.push({ kind: "update", id: row.id, data: { isActive: false } });
  }
  return { ops, conflicts };
}
