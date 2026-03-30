import type { HeirComposition, TimelineRow, TimelineYearSummary, TimelineSimulationResult } from '../types';
import { calculateDetailedInheritanceTax } from './taxCalculator';

const STEP = 5;
const MIN_RATIO = 0;
const MAX_RATIO = 100;

/**
 * 2次相続タイムライン・シミュレーションを計算
 *
 * 配偶者取得割合（0%〜100%）× 経過年数の組み合わせで
 * 1次+2次の合計税額を算出し、各年数での最適解を特定する
 *
 * @param estateValue 対象者の相続財産額（万円）
 * @param spouseOwnEstate 配偶者の固有財産額（万円）
 * @param annualChange 年間収支（万円/年、マイナス=減少）
 * @param selectedYears シミュレーション対象年数の配列
 * @param composition 相続人構成（配偶者あり前提）
 */
export function calculateTimelineSimulation(
  estateValue: number,
  spouseOwnEstate: number,
  annualChange: number,
  selectedYears: number[],
  composition: HeirComposition,
): TimelineSimulationResult {
  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const secondComposition: HeirComposition = { ...composition, hasSpouse: false };

  const rows: TimelineRow[] = [];

  for (let ratio = MAX_RATIO; ratio >= MIN_RATIO; ratio -= STEP) {
    const spouseAcquisition = Math.floor(estateValue * ratio / 100);

    // 1次相続（年数に依存しない・共通）
    const first = calculateDetailedInheritanceTax(
      estateValue,
      composition,
      { mode: 'custom', value: spouseAcquisition, unit: 'amount' },
    );

    // 各年数ごとの2次相続
    const yearColumns = sortedYears.map(years => {
      const reduction = annualChange * years;
      const secondEstate = Math.max(0, spouseOwnEstate + spouseAcquisition + reduction);
      const second = calculateDetailedInheritanceTax(
        secondEstate,
        secondComposition,
        { mode: 'legal' },
      );

      return {
        years,
        secondEstate,
        secondTax: second.totalFinalTax,
        totalTax: first.totalFinalTax + second.totalFinalTax,
        secondBreakdowns: second.heirBreakdowns,
      };
    });

    rows.push({
      ratio,
      spouseAcquisition,
      firstTax: first.totalFinalTax,
      firstBreakdowns: first.heirBreakdowns,
      yearColumns,
    });
  }

  // 各年数の最適解サマリーを算出
  const summaries: TimelineYearSummary[] = sortedYears.map((years, yearIdx) => {
    let optimalRatio = 0;
    let optimalTotalTax = Infinity;

    for (const row of rows) {
      const col = row.yearColumns[yearIdx];
      if (col.totalTax < optimalTotalTax) {
        optimalTotalTax = col.totalTax;
        optimalRatio = row.ratio;
      }
    }

    return {
      years,
      secondEstateReduction: annualChange * years,
      optimalRatio,
      optimalTotalTax,
    };
  });

  return { rows, summaries, selectedYears: sortedYears };
}
