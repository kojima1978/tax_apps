import { describe, expect, it } from 'vitest';
import { formatRetireDate, retireCountdown, scheduledRetirees } from './retirement';
import type { Staff } from './types';

describe('退職予定の書き方', () => {
  it('今年なら月日だけ、来年以降は年も', () => {
    expect(formatRetireDate('2026-11-30', '2026-11-12')).toBe('11月30日');
    expect(formatRetireDate('2027-03-31', '2026-11-12')).toBe('2027年3月31日');
  });

  it('あと何日か。当日は「今日が最終日」、退職済みは空', () => {
    expect(retireCountdown('2026-11-12', '2026-11-12')).toBe('今日が最終日');
    expect(retireCountdown('2026-11-15', '2026-11-12')).toBe('3日後');
    expect(retireCountdown('2026-11-11', '2026-11-12')).toBe('');
  });

  it('退職予定の人は退職日が今日以降の人だけ', () => {
    const people = [
      { id: 1, retiredOn: null },
      { id: 2, retiredOn: '2026-11-12' },
      { id: 3, retiredOn: '2026-12-31' },
      { id: 4, retiredOn: '2026-11-11' },
    ] as Staff[];
    expect(scheduledRetirees(people, '2026-11-12').map((s) => s.id)).toEqual([2, 3]);
  });
});
