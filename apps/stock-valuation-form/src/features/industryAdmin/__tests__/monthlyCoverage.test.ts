import { describe, expect, it } from 'vitest';
import type { IndustryCategory, IndustryMonthlyPrice, IndustryYear } from '@/data/industryDataset';
import { coverageAt, monthlyCoverageOf } from '../monthlyCoverage';

function category(number: number, monthlyPrices: IndustryMonthlyPrice[]): IndustryCategory {
  return {
    number,
    largeName: '製造業',
    middleName: '',
    smallName: '',
    name: '製造業',
    level: 'LARGE',
    dividend: 5.2,
    profit: 34,
    netAsset: 312,
    previousYearAveragePrice: 451,
    monthlyPrices,
  };
}

/** 令和8年分（西暦2026）。各業種目に同じ年月の株価を持たせる。 */
function year(prices: { count: number; months: IndustryMonthlyPrice[] }): IndustryYear {
  return {
    label: '令和8年分',
    era: '令和',
    eraYear: 8,
    gregorianYear: 2026,
    sourceUrl: null,
    note: '',
    categories: Array.from({ length: prices.count }, (_, index) =>
      category(index + 1, prices.months)),
  };
}

const price = (y: number, month: number, twoYearAveragePrice: number | null = null) =>
  ({ year: y, month, price: 763, twoYearAveragePrice });

describe('monthlyCoverageOf', () => {
  it('公表レンジは前年11月から当年12月までの14か月', () => {
    const coverage = monthlyCoverageOf(year({ count: 2, months: [] }));
    const inRange = coverage.months.filter((month) => !month.outOfRange);

    expect(inRange).toHaveLength(14);
    expect(inRange[0]).toMatchObject({ year: 2025, month: 11 });
    expect(inRange[13]).toMatchObject({ year: 2026, month: 12 });
  });

  it('全業種目に入っていれば登録済み、一部なら取込漏れとして partial', () => {
    const full = category(1, [price(2026, 1)]);
    const partial = category(2, []);
    const target: IndustryYear = { ...year({ count: 0, months: [] }), categories: [full, partial] };

    const coverage = monthlyCoverageOf(target);

    expect(coverage.categoryCount).toBe(2);
    expect(coverageAt(coverage, 2026, 1)).toMatchObject({ count: 1, status: 'partial' });
    expect(coverageAt(coverage, 2026, 2)).toMatchObject({ count: 0, status: 'none' });
  });

  it('2年平均は当年の月にだけ期待する（前年11月・12月分には付かない）', () => {
    const coverage = monthlyCoverageOf(year({
      count: 2,
      months: [price(2025, 11), price(2026, 1, 579)],
    }));

    expect(coverageAt(coverage, 2025, 11)).toMatchObject({
      status: 'full', twoYearCount: 0, twoYearExpected: false,
    });
    expect(coverageAt(coverage, 2026, 1)).toMatchObject({
      status: 'full', twoYearCount: 2, twoYearExpected: true,
    });
  });

  it('レンジ外の月も落とさずに末尾へ並べる', () => {
    const coverage = monthlyCoverageOf(year({ count: 1, months: [price(2024, 5)] }));
    const extras = coverage.months.filter((month) => month.outOfRange);

    expect(extras).toHaveLength(1);
    expect(extras[0]).toMatchObject({ year: 2024, month: 5, status: 'full' });
  });

  describe('next（次に取り込むべき月）', () => {
    it('1件も無ければレンジの先頭', () => {
      expect(monthlyCoverageOf(year({ count: 1, months: [] })).next)
        .toEqual({ year: 2025, month: 11 });
    });

    it('途中まで入っていれば最初の未登録月', () => {
      const coverage = monthlyCoverageOf(year({
        count: 1,
        months: [price(2025, 11), price(2025, 12), price(2026, 1, 579)],
      }));

      expect(coverage.next).toEqual({ year: 2026, month: 2 });
    });

    it('歯抜けがあればその月を先に埋める', () => {
      const coverage = monthlyCoverageOf(year({
        count: 1,
        months: [price(2025, 11), price(2026, 1, 579), price(2026, 2, 580)],
      }));

      expect(coverage.next).toEqual({ year: 2025, month: 12 });
    });

    it('レンジが埋まっていれば最終月の翌月（年を跨ぐ）', () => {
      const months = [
        price(2025, 11), price(2025, 12),
        ...Array.from({ length: 12 }, (_, index) => price(2026, index + 1, 579)),
      ];

      expect(monthlyCoverageOf(year({ count: 1, months })).next)
        .toEqual({ year: 2027, month: 1 });
    });
  });
});
