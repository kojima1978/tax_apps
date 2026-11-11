import { summarizeWorkload, type WorkloadResponse } from "@/shared/staff-workload/workload";

// 社員台帳へ返す「社員ごとの担当件数」。顧客（世帯）の担当者を数える。
// 顧客には終わり・ゴミ箱が無い（削除は消えるだけ）ので、進行中＝すべて

export const WORKLOAD_ROLES = [{ key: "assignee", label: "担当" }];

export type WorkloadHouseholdRow = { staff: { id: number; staffDirectoryId: number | null } | null };

export function buildWorkload(households: WorkloadHouseholdRow[]): WorkloadResponse {
  const localId = new Map<number, number>();
  const items = households.flatMap(({ staff }) => {
    if (!staff || staff.staffDirectoryId === null) return [];
    localId.set(staff.staffDirectoryId, staff.id);
    return [{ staffDirectoryId: staff.staffDirectoryId, role: "assignee", active: true }];
  });
  // 顧客一覧の ?staffId= は PB の担当者ID で絞る
  return summarizeWorkload(WORKLOAD_ROLES, "すべて", items, (id) => `?staffId=${localId.get(id)}`);
}
