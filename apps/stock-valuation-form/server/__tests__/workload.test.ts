import { describe, expect, it } from 'vitest';
import { buildWorkload } from '../routes/workload.js';

describe('buildWorkload', () => {
  it('担当者（台帳ID）ごとに数え、ゴミ箱の案件は進行中に数えない', () => {
    const res = buildWorkload([
      { assigneeStaffId: 7, archivedAt: null },
      { assigneeStaffId: 7, archivedAt: new Date('2026-11-01') },
      { assigneeStaffId: null, archivedAt: null },
    ]);
    expect(res.activeLabel).toBe('ゴミ箱を除く');
    expect(res.staff).toEqual([
      { staffDirectoryId: 7, counts: { assignee: { active: 1, total: 2 } }, links: { assignee: '/?assignee=staff:7' } },
    ]);
  });
});
