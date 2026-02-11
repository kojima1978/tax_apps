import type { HeirComposition, TaxCalculationResult } from '../types';
import {
  TAX_BRACKETS,
  BASIC_DEDUCTION,
  THIRD_RANK_SURCHARGE_RATE,
  SHARE_RATIOS,
} from '../constants';
import { getHeirInfo } from './heirUtils';

/**
 * 法定相続分に対する税額を計算
 * @param shareAmount 法定相続分の金額（万円）
 * @returns 算出税額（万円）
 */
function calculateTaxForShare(shareAmount: number): number {
  if (shareAmount <= 0) return 0;
  const bracket = TAX_BRACKETS.find(b => shareAmount <= b.threshold) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = shareAmount * (bracket.rate / 100) - bracket.deduction;
  return Math.floor(Math.max(0, tax));
}

/**
 * 相続税を計算
 */
export function calculateInheritanceTax(
  estateValue: number, // 相続財産額（万円）
  composition: HeirComposition
): TaxCalculationResult {
  // 1. 相続人情報の取得
  const { rank, totalHeirsCount, rankHeirsCount } = getHeirInfo(composition);

  // 2. 基礎控除額の計算: 3,000万円 + (600万円 × 法定相続人の数)
  const basicDeduction = totalHeirsCount > 0
    ? BASIC_DEDUCTION.BASE + (BASIC_DEDUCTION.PER_HEIR * totalHeirsCount)
    : BASIC_DEDUCTION.BASE;

  // 3. 課税遺産総額
  const taxableAmount = Math.max(0, estateValue - basicDeduction);

  if (taxableAmount === 0 || totalHeirsCount === 0) {
    return {
      estateValue,
      basicDeduction,
      taxableAmount: 0,
      totalTax: 0,
      taxAfterSpouseDeduction: 0,
      effectiveTaxRate: 0,
      effectiveTaxRateAfterSpouse: 0,
    };
  }

  // 4. 法定相続分の計算
  let spouseShareRatio = 0;
  let otherShareRatio = 0;

  if (composition.hasSpouse) {
    const ratios = SHARE_RATIOS[rank];
    if (ratios) {
      spouseShareRatio = ratios.spouse;
      otherShareRatio = ratios.others;
    } else {
      // 配偶者のみ（該当順位の相続人なし）
      spouseShareRatio = 1.0;
      otherShareRatio = 0;
    }
  } else {
    // 配偶者なし
    spouseShareRatio = 0;
    otherShareRatio = 1.0;
  }

  // 5. 各相続人の法的相続分に応じた税額計算（相続税の総額）
  let totalTax = 0;

  // A. 配偶者の税額（法定相続分で取得したと仮定）
  if (spouseShareRatio > 0) {
    const spouseAmount = Math.floor(taxableAmount * spouseShareRatio);
    totalTax += calculateTaxForShare(spouseAmount);
  }

  // B. 他の相続人の税額（法定相続分で取得したと仮定）
  if (otherShareRatio > 0 && rankHeirsCount > 0) {
    const othersTotalAmount = Math.floor(taxableAmount * otherShareRatio);
    // 各人の取得分（均等割と仮定）
    const perPersonAmount = Math.floor(othersTotalAmount / rankHeirsCount);

    // 各人の税額を算出
    const perPersonTax = calculateTaxForShare(perPersonAmount);

    // 全員分の税額
    let othersTax = perPersonTax * rankHeirsCount;

    // 第3順位（兄弟姉妹）の場合は2割加算
    // ※代襲相続人（甥姪）も2割加算だが、子が代襲する場合は対象外。
    // ここでは簡易的にrank3なら一律2割加算とする。
    if (rank === 3) {
      othersTax = Math.floor(othersTax * THIRD_RANK_SURCHARGE_RATE);
    }

    totalTax += othersTax;
  }

  // 6. 配偶者控除後の税額計算
  // 実際の遺産分割割合が不明なため、法定相続分通りに分割したと仮定して計算する
  // 配偶者の軽減：法定相続分 or 1億6000万円 のいずれか大きい額までは非課税
  let taxAfterSpouseDeduction = totalTax;

  if (composition.hasSpouse) {
    // 法定相続分通りの取得を前提とした場合、取得額は常に
    // max(1億6000万円, 法定相続分) 以下のため、全額が軽減対象となる
    const spouseAcquisition = Math.floor(taxableAmount * spouseShareRatio);
    const reductionAmount = Math.floor(totalTax * (spouseAcquisition / taxableAmount));
    taxAfterSpouseDeduction = Math.max(0, totalTax - reductionAmount);
  }

  // 7. 実効税率
  const effectiveTaxRate = estateValue > 0 ? (totalTax / estateValue) * 100 : 0;
  const effectiveTaxRateAfterSpouse = estateValue > 0 ? (taxAfterSpouseDeduction / estateValue) * 100 : 0;

  return {
    estateValue,
    basicDeduction,
    taxableAmount,
    totalTax,
    taxAfterSpouseDeduction,
    effectiveTaxRate,
    effectiveTaxRateAfterSpouse,
  };
}
