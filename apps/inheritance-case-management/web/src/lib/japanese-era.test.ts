import { describe, expect, it } from 'vitest';
import { formatWareki, gregorianToWareki, warekiToGregorian } from './japanese-era';

const wareki = (value: string) => {
  const w = gregorianToWareki(value);
  return w ? `${w.era.label}${w.eraYear}` : null;
};

describe('西暦→和暦', () => {
  it('改元日の前後で元号が切り替わる', () => {
    expect(wareki('2019-04-30')).toBe('平成31');
    expect(wareki('2019-05-01')).toBe('令和1');
    expect(wareki('1989-01-07')).toBe('昭和64');
    expect(wareki('1989-01-08')).toBe('平成1');
    expect(wareki('1926-12-24')).toBe('大正15');
    expect(wareki('1926-12-25')).toBe('昭和1');
    expect(wareki('1912-07-29')).toBe('明治45');
    expect(wareki('1912-07-30')).toBe('大正1');
  });

  it('明治より前と不正な書式は null', () => {
    expect(gregorianToWareki('1868-10-22')).toBeNull();
    expect(gregorianToWareki('2026/07/04')).toBeNull();
    expect(gregorianToWareki('2026-7-4')).toBeNull();
    expect(gregorianToWareki('')).toBeNull();
  });
});

describe('和暦→西暦', () => {
  it('元号・年・月・日から YYYY-MM-DD を作る', () => {
    expect(warekiToGregorian('reiwa', 8, 7, 4)).toBe('2026-07-04');
    expect(warekiToGregorian('meiji', 1, 10, 23)).toBe('1868-10-23');
    expect(warekiToGregorian('showa', 64, 1, 7)).toBe('1989-01-07');
  });

  it('年・月・日が範囲外なら null', () => {
    expect(warekiToGregorian('reiwa', 0, 7, 4)).toBeNull();
    expect(warekiToGregorian('reiwa', 8, 13, 4)).toBeNull();
    expect(warekiToGregorian('reiwa', 8, 7, 32)).toBeNull();
  });

  it('改元日をまたぐ日付も往復する', () => {
    for (const value of ['2019-04-30', '2019-05-01', '1989-01-07', '1989-01-08', '2026-02-28']) {
      const w = gregorianToWareki(value)!;
      expect(warekiToGregorian(w.era.code, w.eraYear, w.month, w.day)).toBe(value);
    }
  });

  it('元号の範囲は見ていない（既知の穴）', () => {
    // 「平成40年」は存在しないが通り、読み直すと令和10年になる。
    // 画面（JpDateInput）の年は自由入力なので、ここを塞ぐなら元号ごとの上限が要る。
    expect(warekiToGregorian('heisei', 40, 1, 1)).toBe('2028-01-01');
    expect(wareki('2028-01-01')).toBe('令和10');
  });
});

describe('和暦の表示', () => {
  it('「令和8年7月4日」の形にする', () => {
    expect(formatWareki('2026-07-04')).toBe('令和8年7月4日');
    expect(formatWareki('1989-01-08')).toBe('平成1年1月8日');
  });

  it('未入力と不正値は空文字（画面に "Invalid Date" を出さない）', () => {
    expect(formatWareki(null)).toBe('');
    expect(formatWareki(undefined)).toBe('');
    expect(formatWareki('')).toBe('');
    expect(formatWareki('2026/07/04')).toBe('');
  });
});
