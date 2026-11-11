// 原本は tax_apps/shared/staff-workload/。各アプリの写し（src/shared/ か server/shared/）は
// 直すときは原本を直して `bash shared/sync.sh` で配ること（写しを直すと CI の照合で落ちる）。
//
// 社員台帳が各アプリから読む「社員ごとの担当件数」の形。
//   各アプリ: 案件を1件ずつ WorkloadItem にして summarizeWorkload で組み、
//             GET <basePath>/api/staff-directory/workload で返す（読むだけ）
//   社員台帳: parseWorkload で読み、社員一覧の「担当」列・退職者の担当・編集画面の内訳に使う
// 返すのは台帳ID と件数と、そのアプリの一覧をその人で絞るリンクだけ。氏名・顧客名・会社名は入れない。
// 引き継ぎ先は人が決める ── ここは数えて見せるだけで、担当を書き換える口は作らない。
//
// サーバー（NodeNext）からも読むので、何も import しないこと。

export const WORKLOAD_PATH = '/api/staff-directory/workload';

/** 社員一覧の「担当」列と退職者の担当に数える役割。ほかの役割（社内紹介など）は内訳にだけ出す */
export const PRIMARY_ROLE = 'assignee';

export type WorkloadRole = { key: string; label: string };
/** active: 進行中（終わった案件・ゴミ箱を除く。どこまでを進行中とするかは activeLabel に書く）、total: すべて */
export type WorkloadCount = { active: number; total: number };
export type StaffWorkload = {
  staffDirectoryId: number;
  /** 役割ごとの件数。0件の役割も入れる */
  counts: Record<string, WorkloadCount>;
  /** 役割ごとの、そのアプリの一覧をこの人で絞るリンク（basePath より後ろ。'?' か '/' で始まる）。0件の役割は入れない */
  links: Record<string, string>;
};
export type WorkloadResponse = {
  roles: WorkloadRole[];
  /** 進行中の数え方（例: 「見送り・入金済を除く」）。終わりの無いアプリは「すべて」 */
  activeLabel: string;
  staff: StaffWorkload[];
};

/** 案件1件・役割1つ。台帳に結び付いていない担当者（staffDirectoryId が null）は数えない */
export type WorkloadItem = { staffDirectoryId: number | null; role: string; active: boolean };

export function summarizeWorkload(
  roles: WorkloadRole[],
  activeLabel: string,
  items: WorkloadItem[],
  linkFor: (staffDirectoryId: number, role: string) => string,
): WorkloadResponse {
  const byStaff = new Map<number, StaffWorkload>();
  for (const item of items) {
    if (item.staffDirectoryId === null) continue;
    if (!roles.some((r) => r.key === item.role)) continue;
    let entry = byStaff.get(item.staffDirectoryId);
    if (!entry) {
      entry = { staffDirectoryId: item.staffDirectoryId, counts: {}, links: {} };
      for (const r of roles) entry.counts[r.key] = { active: 0, total: 0 };
      byStaff.set(item.staffDirectoryId, entry);
    }
    const count = entry.counts[item.role]!;
    count.total++;
    if (item.active) count.active++;
    entry.links[item.role] ??= linkFor(item.staffDirectoryId, item.role);
  }
  return { roles, activeLabel, staff: [...byStaff.values()].sort((a, b) => a.staffDirectoryId - b.staffDirectoryId) };
}

const isCount = (v: unknown): v is WorkloadCount =>
  typeof v === 'object' && v !== null && Number.isInteger((v as WorkloadCount).active) && Number.isInteger((v as WorkloadCount).total);

/** 社員台帳が読むときの形の確かめ。形が違えば null（そのアプリは「—」にする） */
export function parseWorkload(json: unknown): WorkloadResponse | null {
  if (typeof json !== 'object' || json === null) return null;
  const { roles, activeLabel, staff } = json as Partial<WorkloadResponse>;
  if (!Array.isArray(roles) || !roles.every((r) => typeof r?.key === 'string' && typeof r?.label === 'string')) return null;
  if (typeof activeLabel !== 'string' || !Array.isArray(staff)) return null;
  for (const s of staff) {
    if (!Number.isInteger(s?.staffDirectoryId) || typeof s.counts !== 'object' || s.counts === null) return null;
    if (!roles.every((r) => isCount(s.counts[r.key]))) return null;
    if (typeof s.links !== 'object' || s.links === null || !Object.values(s.links).every((l) => typeof l === 'string')) return null;
  }
  return { roles, activeLabel, staff };
}
