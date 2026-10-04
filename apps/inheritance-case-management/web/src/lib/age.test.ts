import { describe, expect, it } from 'vitest';
import { ageOnDate } from './age';

describe('死亡日時点の満年齢', () => {
  it('誕生日の前日までは1つ下', () => {
    expect(ageOnDate('1950-06-15', '2026-06-14')).toBe(75);
    expect(ageOnDate('1950-06-15', '2026-06-15')).toBe(76);
    expect(ageOnDate('1950-06-15', '2026-05-31')).toBe(75);
  });

  it('同日なら0歳', () => {
    expect(ageOnDate('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('算出できないときは null（画面に「-1歳」を出さない）', () => {
    expect(ageOnDate(null, '2026-01-01')).toBeNull();
    expect(ageOnDate('1950-06-15', null)).toBeNull();
    expect(ageOnDate('1950/06/15', '2026-01-01')).toBeNull();
    // 生年月日が死亡日より後（入力ミス）
    expect(ageOnDate('2026-06-15', '2025-01-01')).toBeNull();
  });
});
