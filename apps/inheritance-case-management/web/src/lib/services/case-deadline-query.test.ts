import { describe, expect, it } from 'vitest';
import { buildDeadlineCondition } from './case-deadline-query';
import { getDeadlineDate } from '../deadline-utils';
import { applyKpiCardFilter, getCaseListKpiFilters, parseCaseListUrlParams, toCaseListUrlSearch } from '@/app/case-list-utils';
import { selectedCaseIdsSchema } from '@/types/validation';

describe('期限の絞り込み', () => {
  it('DBへ投げる条件が、画面に出る期限と同じ案件を選ぶ（月末・閏年を含む）', () => {
    for (const year of [2024, 2025, 2026]) {
      for (let month = 0; month < 12; month++) {
        for (const date of [1, 2, 28, 30, 31]) {
          const today = new Date(Date.UTC(year, month, date));
          const start = new Date(today);
          start.setUTCMonth(start.getUTCMonth() - 10);
          start.setUTCDate(start.getUTCDate() - 15);
          for (const kind of ['soon', 'overdue'] as const) {
            const query = buildDeadlineCondition(kind, today);
            const ranges = query.OR as { dateOfDeath: { lt?: Date; gte?: Date } }[];
            for (let offset = 0; offset < 65; offset++) {
              const death = new Date(start.getTime() + offset * 86400000);
              const due = getDeadlineDate(death);
              const days = (due.getTime() - today.getTime()) / 86400000;
              const expected = kind === 'overdue' ? days < 0 : days >= 0 && days <= 14;
              const actual = ranges.some(({ dateOfDeath: r }) => (!r.lt || death < r.lt) && (!r.gte || death >= r.gte));
              expect(actual, `${kind}: today=${today.toISOString()}, death=${death.toISOString()}`).toBe(expected);
            }
          }
        }
      }
    }
  });

  it('期限カードを切り替えても検索条件は残り、URLを往復しても戻る', () => {
    const base = { fiscalYear: 2026, assigneeId: 12, search: '検索', page: 3 };
    const overdue = applyKpiCardFilter(base, 'deadlineOverdue');
    expect(overdue.page).toBe(1);
    expect(overdue.assigneeId).toBe(12);
    expect(parseCaseListUrlParams(new URLSearchParams(toCaseListUrlSearch(overdue))).deadlineOverdue).toBe(true);
    const soon = applyKpiCardFilter(overdue, 'deadlineSoon');
    expect(soon.deadlineOverdue).toBeUndefined();
    expect(soon.deadlineSoon).toBe(true);
    expect(getCaseListKpiFilters(soon).deadlineSoon).toBeUndefined();
    expect(getCaseListKpiFilters(soon).assigneeId).toBe(12);
    expect(applyKpiCardFilter(soon, 'deadlineSoon').deadlineSoon).toBeUndefined();
  });
});

describe('まとめて削除の入力検証', () => {
  it('明示的に選んだIDが1件以上要る（絞り込み条件だけの削除は通さない）', () => {
    for (const input of [{}, { ids: [] }, { fiscalYear: 2026 }, { ids: [0] }, { ids: ['1'] }, { ids: [1], fiscalYear: 2026 }]) {
      expect(selectedCaseIdsSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
    expect(selectedCaseIdsSchema.parse({ ids: [1, 3] })).toEqual({ ids: [1, 3] });
  });
});
