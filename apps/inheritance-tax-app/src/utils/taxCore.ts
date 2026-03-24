import type { HeirType } from '../types';
import { TAX_BRACKETS, BASIC_DEDUCTION, SHARE_RATIOS } from '../constants';

/** 法定相続分の割合を取得 */
export function getLegalShareRatios(hasSpouse: boolean, rank: number): { spouse: number; others: number } {
  if (hasSpouse) {
    const ratios = SHARE_RATIOS[rank];
    return ratios ? { spouse: ratios.spouse, others: ratios.others } : { spouse: 1.0, others: 0 };
  }
  return { spouse: 0, others: 1.0 };
}

/** 基礎控除額を計算 */
export function calculateBasicDeduction(totalHeirsCount: number): number {
  return totalHeirsCount > 0
    ? BASIC_DEDUCTION.BASE + (BASIC_DEDUCTION.PER_HEIR * totalHeirsCount)
    : BASIC_DEDUCTION.BASE;
}

/** 法定相続分に対する税額を計算 */
export function calculateTaxForShare(shareAmount: number): number {
  if (shareAmount <= 0) return 0;
  const bracket = TAX_BRACKETS.find(b => shareAmount <= b.threshold) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  return Math.floor(Math.max(0, shareAmount * (bracket.rate / 100) - bracket.deduction));
}

/** 順位→相続人種別 */
export const RANK_TO_HEIR_TYPE: Record<number, HeirType> = { 1: 'child', 2: 'parent', 3: 'sibling' };
