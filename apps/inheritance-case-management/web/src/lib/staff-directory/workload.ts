import { summarizeWorkload, type WorkloadItem, type WorkloadResponse } from '@/shared/staff-workload/workload';
import { CLOSED_STATUSES } from '@/types/constants';

// 社員台帳へ返す「社員ごとの担当件数」。担当と社内紹介を分けて数える。
// 進行中は 見送り・入金済 以外（見積前〜請求済）── 一覧の既定（終了案件を隠す）と同じ線なので、
// リンク先の一覧に出る件数と進行中の件数がそろう。線を変えるときは CLOSED_STATUSES を直す

export const WORKLOAD_ROLES = [
  { key: 'assignee', label: '担当' },
  { key: 'internalReferrer', label: '社内紹介' },
];

export const WORKLOAD_ACTIVE_LABEL = `${CLOSED_STATUSES.join('・')}を除く`;

export type WorkloadCaseRow = {
  status: string;
  assignee: { id: number; staffDirectoryId: number | null } | null;
  internalReferrer: { id: number; staffDirectoryId: number | null } | null;
};

export function buildWorkload(cases: WorkloadCaseRow[]): WorkloadResponse {
  // リンクは itcm の担当者ID で絞る（台帳ID から引けるよう、数えながら控える）
  const localId = new Map<string, number>();
  const items: WorkloadItem[] = [];
  for (const c of cases) {
    const active = !(CLOSED_STATUSES as readonly string[]).includes(c.status);
    for (const [role, person] of [
      ['assignee', c.assignee],
      ['internalReferrer', c.internalReferrer],
    ] as const) {
      if (!person || person.staffDirectoryId === null) continue;
      localId.set(`${role}:${person.staffDirectoryId}`, person.id);
      items.push({ staffDirectoryId: person.staffDirectoryId, role, active });
    }
  }
  // 年度は「すべて」（既定の今年度に絞らない）。終了案件は一覧の既定どおり隠れる
  return summarizeWorkload(WORKLOAD_ROLES, WORKLOAD_ACTIVE_LABEL, items, (id, role) => {
    const param = role === 'assignee' ? 'assigneeId' : 'internalReferrerId';
    return `?${param}=${localId.get(`${role}:${id}`)}&fiscalYear=all`;
  });
}
