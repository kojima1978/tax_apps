import { describe, expect, it } from 'vitest';
import { axisLabel, maxMonthIndex, niceStep } from './MonthlyChart';

describe('maxMonthIndex', () => {
  const keys = ['2024-01', '2024-02', '2024-03', '2024-04'];
  it('出金＋入金が最大の月', () => {
    expect(maxMonthIndex(keys, [10, 0, 50, 0], [0, 70, 0, 5], '')).toBe(1);
  });
  it('相続開始月以降は選ばない', () => {
    expect(maxMonthIndex(keys, [10, 0, 500, 0], [0, 70, 0, 5], '2024-03')).toBe(1);
  });
  it('対象の月がすべて0なら印を付けない', () => {
    expect(maxMonthIndex(keys, [0, 0, 9, 0], [0, 0, 0, 0], '2024-03')).toBe(-1);
  });
});

describe('目盛り', () => {
  it('1・2・5 × 10のべきで刻む', () => {
    expect(niceStep(1_000_000)).toBe(500_000);
    expect(niceStep(3_100_000)).toBe(1_000_000);
    expect(niceStep(0)).toBe(1);
  });
  it('万・億で縮める', () => {
    expect(axisLabel(5_000)).toBe('5,000');
    expect(axisLabel(1_500_000)).toBe('150万');
    expect(axisLabel(250_000_000)).toBe('2.5億');
  });
});
