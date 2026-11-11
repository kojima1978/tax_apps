import { describe, expect, it } from 'vitest';
import { daysUntilRetirement, isRetired, jstToday, retirementState } from './retirement';

describe('jstToday', () => {
  it('日本時間の日付（UTC の 15時で日付が変わる）', () => {
    expect(jstToday(new Date('2026-11-12T14:59:59Z'))).toBe('2026-11-12');
    expect(jstToday(new Date('2026-11-12T15:00:00Z'))).toBe('2026-11-13');
  });
});

describe('isRetired / retirementState', () => {
  const today = '2026-11-12';

  it('退職日の無い人は在籍', () => {
    expect(isRetired(null, today)).toBe(false);
    expect(retirementState(null, today)).toBe('active');
  });

  it('退職日が今日以降なら退職予定（まだ在籍）', () => {
    expect(isRetired('2026-11-12', today)).toBe(false);
    expect(isRetired('2026-11-13', today)).toBe(false);
    expect(retirementState('2026-11-12', today)).toBe('scheduled');
    expect(retirementState('2027-03-31', today)).toBe('scheduled');
  });

  it('退職日の翌日から退職', () => {
    expect(isRetired('2026-11-11', today)).toBe(true);
    expect(retirementState('2026-11-11', today)).toBe('retired');
    // 日付をまたぐと切り替わる
    expect(isRetired('2026-11-12', '2026-11-13')).toBe(true);
  });
});

describe('daysUntilRetirement', () => {
  it('当日は0、明日は1、退職済み・在籍は null', () => {
    expect(daysUntilRetirement('2026-11-12', '2026-11-12')).toBe(0);
    expect(daysUntilRetirement('2026-11-13', '2026-11-12')).toBe(1);
    expect(daysUntilRetirement('2027-03-31', '2026-11-12')).toBe(139);
    expect(daysUntilRetirement('2026-11-11', '2026-11-12')).toBeNull();
    expect(daysUntilRetirement(null, '2026-11-12')).toBeNull();
  });
});
