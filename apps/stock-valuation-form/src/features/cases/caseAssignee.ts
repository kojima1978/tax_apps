// 案件の担当者（社員台帳の ID と、設定した時点の氏名の写し）の表示と絞り込み。
//
// 担当は年分（案件）ごとに持つ。会社一覧では「その会社のどれかの年分の担当」を担当とみなす
// ── 翌年度更新で担当が替わっても、前の年分の担当者からも探せるように。

import type { CaseAssignee } from './api';

/** 台帳の人。shared/staff-directory/operator の Operator のうち、ここで使う分だけ。 */
interface DirectoryPerson {
  id: number | null;
  fullName: string;
}

/**
 * 一覧に出す担当者名。台帳に今いればその氏名（改姓が反映される）、居なければ設定時の写し。
 * 未設定は null。
 */
export function assigneeLabel(assignee: CaseAssignee | null, people: readonly DirectoryPerson[]): string | null {
  if (assignee === null) return null;
  return people.find((p) => p.id === assignee.staffId)?.fullName ?? assignee.name;
}

/** 'all' = 絞らない / 'mine' = 操作者の担当 / 'none' = 担当者なし */
export type AssigneeFilter = 'all' | 'mine' | 'none';

export const ASSIGNEE_FILTERS: readonly AssigneeFilter[] = ['all', 'mine', 'none'];

export function isAssigneeFilter(value: unknown): value is AssigneeFilter {
  return ASSIGNEE_FILTERS.includes(value as AssigneeFilter);
}

/**
 * 会社の塊を担当者で絞る。'mine' で操作者を選んでいない（myId が null）ときは何も残さない
 * ── 「すべて」を見せると、自分の担当だけに絞れているように見えてしまう。
 */
export function filterGroupsByAssignee<G extends { items: readonly { assignee: CaseAssignee | null }[] }>(
  groups: readonly G[],
  filter: AssigneeFilter,
  myId: number | null,
): readonly G[] {
  if (filter === 'all') return groups;
  if (filter === 'none') return groups.filter((g) => g.items.every((item) => item.assignee === null));
  if (myId === null) return [];
  return groups.filter((g) => g.items.some((item) => item.assignee?.staffId === myId));
}
