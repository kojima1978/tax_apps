// 案件の担当者（社員台帳の ID と、設定した時点の氏名の写し）の表示と絞り込み。
//
// 担当は年分（案件）ごとに持つ。会社一覧では「その会社のどれかの年分の担当」を担当とみなす
// ── 翌年度更新で担当が替わっても、前の年分の担当者からも探せるように。

import { type AssigneeFilter, assigneeMatches } from '@/shared/staff-directory/assignee';
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

/**
 * 会社の塊を担当者で絞る（絞り込みの種類と1件の当たり外れは全アプリ共通の assignee.ts）。
 * 'none' はどの年分にも担当が居ない会社、それ以外はどれかの年分が当たれば残す。
 * 'mine' で操作者を選んでいない（myId が null）ときは何も残さない
 * ── 「すべて」を見せると、自分の担当だけに絞れているように見えてしまう。
 */
export function filterGroupsByAssignee<G extends { items: readonly { assignee: CaseAssignee | null }[] }>(
  groups: readonly G[],
  filter: AssigneeFilter,
  myId: number | null,
): readonly G[] {
  if (filter === 'all') return groups;
  if (filter === 'none') return groups.filter((g) => g.items.every((item) => item.assignee === null));
  return groups.filter((g) => g.items.some((item) => assigneeMatches(item.assignee, filter, myId)));
}
