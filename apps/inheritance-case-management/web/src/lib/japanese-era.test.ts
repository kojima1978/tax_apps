import { describe, expect, it } from 'vitest';
import { convertWareki, eraLastYear, formatWareki, gregorianToWareki, warekiToGregorian } from './japanese-era';

const wareki = (value: string) => {
  const w = gregorianToWareki(value);
  return w ? `${w.era.label}${w.eraYear}` : null;
};

const reason = (...args: Parameters<typeof convertWareki>) => {
  const result = convertWareki(...args);
  return result.ok ? null : result.reason;
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

  it('書式は合っていても実在しない日付は null（読み替えて別の日を出さない）', () => {
    expect(gregorianToWareki('2026-02-31')).toBeNull();
    expect(gregorianToWareki('2026-13-01')).toBeNull();
    expect(gregorianToWareki('2026-00-10')).toBeNull();
    expect(wareki('2024-02-29')).toBe('令和6'); // 閏年は通る
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
});

describe('元号の範囲', () => {
  it('元号ごとの年の上限（画面の入力欄の max に使う）', () => {
    expect(eraLastYear('heisei')).toBe(31);
    expect(eraLastYear('showa')).toBe(64);
    expect(eraLastYear('taisho')).toBe(15);
    expect(eraLastYear('meiji')).toBe(45);
    expect(eraLastYear('reiwa')).toBeUndefined(); // 現行元号に上限は無い
  });

  it('存在しない元号年は通さない（平成40年＝令和10年に化けない）', () => {
    expect(warekiToGregorian('heisei', 40, 1, 1)).toBeNull();
    expect(reason('heisei', 40, 1, 1)).toBe('平成は31年4月30日までです');
  });

  it('改元日の1日またぎも弾く', () => {
    expect(warekiToGregorian('heisei', 31, 4, 30)).toBe('2019-04-30');
    expect(warekiToGregorian('heisei', 31, 5, 1)).toBeNull();
    expect(reason('heisei', 31, 5, 1)).toBe('平成は31年4月30日までです');

    expect(warekiToGregorian('showa', 64, 1, 7)).toBe('1989-01-07');
    expect(reason('showa', 64, 1, 8)).toBe('昭和は64年1月7日までです');
  });

  it('元号の開始日より前も弾く（理由は「元年」で出す）', () => {
    expect(warekiToGregorian('heisei', 1, 1, 8)).toBe('1989-01-08');
    expect(reason('heisei', 1, 1, 7)).toBe('平成は元年1月8日からです');
    expect(reason('meiji', 1, 10, 22)).toBe('明治は元年10月23日からです');
  });

  it('現行元号には上限が無い', () => {
    expect(warekiToGregorian('reiwa', 50, 1, 1)).toBe('2068-01-01');
  });
});

describe('実在しない日付', () => {
  it('2月31日・13月は理由付きで弾く', () => {
    expect(reason('reiwa', 8, 2, 31)).toBe('2月31日はありません');
    expect(reason('reiwa', 8, 13, 1)).toBe('13月1日はありません');
  });

  it('閏日は閏年だけ通す', () => {
    expect(warekiToGregorian('reiwa', 2, 2, 29)).toBe('2020-02-29');
    expect(warekiToGregorian('reiwa', 3, 2, 29)).toBeNull();
  });

  it('整数以外は整数で入れるよう促す', () => {
    expect(reason('reiwa', 8.5, 7, 4)).toBe('年月日は整数で入れてください');
    expect(reason('reiwa', 8, Number.NaN, 4)).toBe('年月日は整数で入れてください');
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
