// 月別株価が「どこまで入っているか」の集計。
//
// 取込画面で次にどの月を貼り付ければよいかを判断するための材料で、
// データはすべて /industry-dataset の取得結果から数えられる（APIの追加は不要）。

import type { IndustryYear } from '@/data/industryDataset';

export type CoverageStatus = 'none' | 'partial' | 'full';

export interface CoverageMonth {
  year: number;
  month: number;
  /** この年月の株価が入っている業種目の数。 */
  count: number;
  /** うち2年平均株価も入っている数。 */
  twoYearCount: number;
  /**
   * 2年平均株価が公表される月か。
   * 前年11月・12月分は前月・前々月の株価として載るだけなので付かない。
   */
  twoYearExpected: boolean;
  /** 公表レンジ（前年11月〜当年12月）の外にある月。 */
  outOfRange: boolean;
  status: CoverageStatus;
}

export interface MonthlyCoverage {
  /** 集計対象の年分（西暦）。月ラベルで「前年」を判別するのに使う。 */
  gregorianYear: number;
  /** 業種目の総数。各月の count がこれに満たなければ取込漏れ。 */
  categoryCount: number;
  months: CoverageMonth[];
  /** 次に取り込むべき年月。すべて埋まっていれば最終月の翌月。 */
  next: { year: number; month: number };
}

/** 年分の公表レンジ。前年11月・12月分は前月・前々月の株価として併載される。 */
function rangeOf(gregorianYear: number): { year: number; month: number }[] {
  return [
    { year: gregorianYear - 1, month: 11 },
    { year: gregorianYear - 1, month: 12 },
    ...Array.from({ length: 12 }, (_, index) => ({ year: gregorianYear, month: index + 1 })),
  ];
}

function keyOf(year: number, month: number): string {
  return `${year}-${month}`;
}

function statusOf(count: number, categoryCount: number): CoverageStatus {
  if (count === 0) return 'none';
  return count >= categoryCount ? 'full' : 'partial';
}

/** 翌月（年跨ぎを正しく扱う）。 */
function nextMonthOf(year: number, month: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function monthlyCoverageOf(year: IndustryYear): MonthlyCoverage {
  const categoryCount = year.categories.length;

  const counts = new Map<string, { count: number; twoYearCount: number }>();
  for (const category of year.categories) {
    for (const price of category.monthlyPrices) {
      const key = keyOf(price.year, price.month);
      const entry = counts.get(key) ?? { count: 0, twoYearCount: 0 };
      entry.count += 1;
      if (price.twoYearAveragePrice !== null) entry.twoYearCount += 1;
      counts.set(key, entry);
    }
  }

  const range = rangeOf(year.gregorianYear);
  const inRange = new Set(range.map(({ year: y, month }) => keyOf(y, month)));

  const toMonth = (y: number, month: number, outOfRange: boolean): CoverageMonth => {
    const entry = counts.get(keyOf(y, month)) ?? { count: 0, twoYearCount: 0 };
    return {
      year: y,
      month,
      count: entry.count,
      twoYearCount: entry.twoYearCount,
      twoYearExpected: y === year.gregorianYear,
      outOfRange,
      status: statusOf(entry.count, categoryCount),
    };
  };

  // レンジ外の月も落とさずに末尾へ並べる（年分を間違えて取り込んだ場合に気付けるように）。
  const extras = Array.from(counts.keys())
    .filter((key) => !inRange.has(key))
    .map((key) => key.split('-').map(Number) as [number, number])
    .sort(([ay, am], [by, bm]) => ay - by || am - bm)
    .map(([y, month]) => toMonth(y, month, true));

  const months = [
    ...range.map(({ year: y, month }) => toMonth(y, month, false)),
    ...extras,
  ];

  return {
    gregorianYear: year.gregorianYear,
    categoryCount,
    months,
    next: nextToImport(months),
  };
}

/**
 * 次に取り込むべき年月。
 * レンジ内に未登録の月があればその先頭、無ければ最終登録月の翌月。
 * 一部しか入っていない月は、取込漏れとして表示側で目立たせるのでここでは選ばない。
 */
function nextToImport(months: readonly CoverageMonth[]): { year: number; month: number } {
  const empty = months.find((month) => !month.outOfRange && month.status === 'none');
  if (empty) return { year: empty.year, month: empty.month };

  const registered = months.filter((month) => month.status !== 'none');
  const last = registered[registered.length - 1];
  if (!last) {
    const first = months[0]!;
    return { year: first.year, month: first.month };
  }
  return nextMonthOf(last.year, last.month);
}

/** 指定した年月の登録状況。取込先として選ばれている月の注意書きに使う。 */
export function coverageAt(
  coverage: MonthlyCoverage,
  year: number,
  month: number,
): CoverageMonth | undefined {
  return coverage.months.find((entry) => entry.year === year && entry.month === month);
}
