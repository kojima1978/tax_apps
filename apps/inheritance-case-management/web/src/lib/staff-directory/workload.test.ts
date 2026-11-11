import { describe, expect, it } from 'vitest';
import { buildWorkload, WORKLOAD_ACTIVE_LABEL } from './workload';

const person = (id: number, staffDirectoryId: number | null) => ({ id, staffDirectoryId });

describe('buildWorkload', () => {
  it('担当と社内紹介を分け、見送り・入金済は進行中に数えない', () => {
    const res = buildWorkload([
      { status: '受託', assignee: person(5, 10), internalReferrer: person(6, 20) },
      { status: '入金済', assignee: person(5, 10), internalReferrer: null },
      { status: '見送り', assignee: person(5, 10), internalReferrer: null },
      { status: '見積前', assignee: person(6, 20), internalReferrer: person(5, 10) },
    ]);
    expect(WORKLOAD_ACTIVE_LABEL).toBe('見送り・入金済を除く');
    expect(res.staff).toEqual([
      {
        staffDirectoryId: 10,
        counts: { assignee: { active: 1, total: 3 }, internalReferrer: { active: 1, total: 1 } },
        links: { assignee: '?assigneeId=5&fiscalYear=all', internalReferrer: '?internalReferrerId=5&fiscalYear=all' },
      },
      {
        staffDirectoryId: 20,
        counts: { assignee: { active: 1, total: 1 }, internalReferrer: { active: 1, total: 1 } },
        links: { assignee: '?assigneeId=6&fiscalYear=all', internalReferrer: '?internalReferrerId=6&fiscalYear=all' },
      },
    ]);
  });

  it('台帳に結び付いていない担当者は数えない', () => {
    expect(buildWorkload([{ status: '受託', assignee: person(1, null), internalReferrer: null }]).staff).toEqual([]);
  });
});
