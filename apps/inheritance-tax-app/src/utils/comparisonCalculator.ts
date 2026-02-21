import type { HeirComposition, ComparisonRow } from '../types';
import { calculateDetailedInheritanceTax } from './taxCalculator';

const STEP = 5;
const MIN_RATIO = 0;
const MAX_RATIO = 100;

/**
 * 1次相続・2次相続の配偶者取得割合別比較テーブルを計算
 *
 * @param estateValue 対象者の相続財産額（万円）
 * @param spouseOwnEstate 配偶者の固有財産額（万円）
 * @param composition 相続人構成（配偶者あり前提）
 * @returns 100%〜0%（5%刻み・降順）の比較行配列（21行）
 */
export function calculateComparisonTable(
  estateValue: number,
  spouseOwnEstate: number,
  composition: HeirComposition,
): ComparisonRow[] {
  const secondComposition: HeirComposition = { ...composition, hasSpouse: false };
  const rows: ComparisonRow[] = [];

  for (let ratio = MAX_RATIO; ratio >= MIN_RATIO; ratio -= STEP) {
    const spouseAcquisition = Math.floor(estateValue * ratio / 100);

    // 1次相続: 配偶者が spouseAcquisition を取得
    const first = calculateDetailedInheritanceTax(
      estateValue,
      composition,
      { mode: 'custom', value: spouseAcquisition },
    );

    // 2次相続: 配偶者固有財産 + 1次相続取得額
    const secondEstate = spouseOwnEstate + spouseAcquisition;
    const second = calculateDetailedInheritanceTax(
      secondEstate,
      secondComposition,
      { mode: 'legal' },
    );

    rows.push({
      ratio,
      spouseAcquisition,
      firstTax: first.totalFinalTax,
      secondEstate,
      secondTax: second.totalFinalTax,
      totalTax: first.totalFinalTax + second.totalFinalTax,
      firstBreakdowns: first.heirBreakdowns,
      secondBreakdowns: second.heirBreakdowns,
    });
  }

  return rows;
}
