import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDeadlineCondition } from './case-deadline-query';
import { getDeadlineDate } from '../deadline-utils';
import { applyKpiCardFilter, getCaseListKpiFilters, parseCaseListUrlParams, toCaseListUrlSearch } from '@/app/case-list-utils';
import { selectedCaseIdsSchema } from '@/types/validation';

test('deadline query agrees with displayed deadlines across month ends and leap years', () => {
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
            assert.equal(actual, expected, `${kind}: today=${today.toISOString()}, death=${death.toISOString()}`);
          }
        }
      }
    }
  }
});

test('deadline card switches preserve search context and survive URL round trips', () => {
  const base = { fiscalYear: 2026, assigneeId: 12, search: '検索', page: 3 };
  const overdue = applyKpiCardFilter(base, 'deadlineOverdue');
  assert.equal(overdue.page, 1);
  assert.equal(overdue.assigneeId, 12);
  assert.equal(parseCaseListUrlParams(new URLSearchParams(toCaseListUrlSearch(overdue))).deadlineOverdue, true);
  const soon = applyKpiCardFilter(overdue, 'deadlineSoon');
  assert.equal(soon.deadlineOverdue, undefined);
  assert.equal(soon.deadlineSoon, true);
  assert.equal(getCaseListKpiFilters(soon).deadlineSoon, undefined);
  assert.equal(getCaseListKpiFilters(soon).assigneeId, 12);
  assert.equal(applyKpiCardFilter(soon, 'deadlineSoon').deadlineSoon, undefined);
});

test('bulk deletion requires a nonempty explicit selection and rejects filter-only requests', () => {
  for (const input of [{}, { ids: [] }, { fiscalYear: 2026 }, { ids: [0] }, { ids: ['1'] }, { ids: [1], fiscalYear: 2026 }]) {
    assert.equal(selectedCaseIdsSchema.safeParse(input).success, false);
  }
  assert.deepEqual(selectedCaseIdsSchema.parse({ ids: [1, 3] }), { ids: [1, 3] });
});
