import { describe, expect, it } from 'vitest';
import {
  archiveFileName,
  groupMonthlyPricesByMonth,
  parseYearArchive,
  type ArchiveCategory,
} from '../yearArchive';

function category(number: number, monthlyPrices: ArchiveCategory['monthlyPrices'] = []) {
  return {
    number,
    largeName: '製造業',
    middleName: '',
    smallName: '',
    name: '製造業',
    level: 'LARGE' as const,
    description: 'この業種目に属する会社',
    dividend: 5.2,
    profit: 34,
    netAsset: 312,
    previousYearAveragePrice: 451,
    monthlyPrices,
  };
}

function archive(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    formatVersion: 1,
    exportedAt: '2026-09-05T00:00:00.000Z',
    label: '令和8年分',
    era: '令和',
    eraYear: 8,
    gregorianYear: 2026,
    categories: [
      category(1, [
        { year: 2025, month: 11, price: 400, twoYearAveragePrice: 380 },
        { year: 2026, month: 1, price: 420, twoYearAveragePrice: 390 },
      ]),
      category(2, [{ year: 2025, month: 12, price: 410, twoYearAveragePrice: null }]),
    ],
    ...overrides,
  });
}

/** 検証エラーは「どのファイルのどこが違うか」まで出す前提なので、文言も合わせて確かめる。 */
function errorOf(text: string): string {
  const result = parseYearArchive(text);
  expect(result.ok).toBe(false);
  return result.ok ? '' : result.error;
}

describe('parseYearArchive', () => {
  it('書き出したJSONを読み、月別株価を年月ごとにまとめる', () => {
    const result = parseYearArchive(archive());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.archive.label).toBe('令和8年分');
    expect(result.archive.era).toBe('令和');
    expect(result.archive.eraYear).toBe(8);
    expect(result.archive.gregorianYear).toBe(2026);
    expect(result.archive.categories).toHaveLength(2);
    expect(result.archive.monthlyPriceCount).toBe(3);
    expect(result.archive.months.map((group) => `${group.year}-${group.month}`))
      .toEqual(['2025-11', '2025-12', '2026-1']);
  });

  it('内容説明（description）を落とさない', () => {
    const result = parseYearArchive(archive());
    expect(result.ok && result.archive.categories[0]?.description).toBe('この業種目に属する会社');
  });

  it('JSONとして読めないものを弾く', () => {
    expect(errorOf('{ではない')).toContain('JSONとして読めません');
  });

  it('年分の書き出しファイルでないものを弾く', () => {
    expect(errorOf('[]')).toContain('オブジェクトではありません');
    expect(errorOf(JSON.stringify({ 番号: 1 }))).toContain('元号（era）がありません');
  });

  it('アプリより新しい形式を弾く', () => {
    expect(errorOf(archive({ formatVersion: 99 }))).toContain('新しい形式です');
  });

  it('業種目が1件も無いものを弾く', () => {
    expect(errorOf(archive({ categories: [] }))).toContain('1件も入っていません');
  });

  it('業種目番号の重複を弾く', () => {
    expect(errorOf(archive({ categories: [category(3), category(3)] }))).toContain('重複');
  });

  it('B・C・Dが欠けた業種目は、送る前に業種目番号つきで弾く', () => {
    const broken = archive({ categories: [{ ...category(7), dividend: null }] });
    expect(errorOf(broken)).toBe('業種目 7: B（配当）が数値ではありません');
  });

  it('月別株価の月が範囲外なら弾く', () => {
    const broken = archive({
      categories: [category(1, [{ year: 2026, month: 13, price: 400, twoYearAveragePrice: null }])],
    });
    expect(errorOf(broken)).toContain('月別株価の年月が読めません');
  });

  it('月別株価が無くても読める（業種目マスタだけの年分）', () => {
    const result = parseYearArchive(archive({ categories: [category(1)] }));
    expect(result.ok && result.archive.months).toEqual([]);
    expect(result.ok && result.archive.monthlyPriceCount).toBe(0);
  });
});

describe('groupMonthlyPricesByMonth', () => {
  it('年月順に並べ、1ヶ月分の行に業種目番号を持たせる', () => {
    const groups = groupMonthlyPricesByMonth([
      category(2, [{ year: 2026, month: 1, price: 420, twoYearAveragePrice: 390 }]),
      category(1, [
        { year: 2026, month: 1, price: 400, twoYearAveragePrice: 380 },
        { year: 2025, month: 12, price: 390, twoYearAveragePrice: null },
      ]),
    ]);

    expect(groups).toEqual([
      { year: 2025, month: 12, rows: [{ number: 1, price: 390, twoYearAveragePrice: null }] },
      {
        year: 2026,
        month: 1,
        rows: [
          { number: 2, price: 420, twoYearAveragePrice: 390 },
          { number: 1, price: 400, twoYearAveragePrice: 380 },
        ],
      },
    ]);
  });
});

describe('archiveFileName', () => {
  it('年分と西暦が入った名前にする', () => {
    expect(archiveFileName('令和8年分', 2026)).toBe('業種目データ_令和8年分_2026.json');
  });
});
