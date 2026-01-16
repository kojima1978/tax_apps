import { useMemo } from 'react';
import type { HeirComposition, TaxBracket, TaxCalculationResult } from '../types';

// 相続税の税率区分（法定相続分に応じた取得金額ベース）
export const TAX_BRACKETS: TaxBracket[] = [
  { threshold: 1000, rate: 10, deduction: 0 },      // 1,000万円以下
  { threshold: 3000, rate: 15, deduction: 50 },     // 3,000万円以下
  { threshold: 5000, rate: 20, deduction: 200 },    // 5,000万円以下
  { threshold: 10000, rate: 30, deduction: 700 },   // 1億円以下
  { threshold: 20000, rate: 40, deduction: 1700 },  // 2億円以下
  { threshold: 30000, rate: 45, deduction: 2700 },  // 3億円以下
  { threshold: 60000, rate: 50, deduction: 4200 },  // 6億円以下
  { threshold: Infinity, rate: 55, deduction: 7200 }, // 6億円超
];

/**
 * 法定相続分に対する税額を計算
 */
function calculateTaxForShare(shareAmount: number): number {
  const bracket = TAX_BRACKETS.find(b => shareAmount <= b.threshold) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = shareAmount * (bracket.rate / 100) - bracket.deduction;
  return Math.floor(Math.max(0, tax));
}

/**
 * 相続人の総数を計算（基礎控除額の計算用）
 */
function countTotalHeirs(composition: HeirComposition): number {
  let count = composition.hasSpouse ? 1 : 0;

  // 選択された順位に基づいて相続人を数える
  if (composition.selectedRank === 'rank1') {
    // 第1順位：子供（代襲相続人含む）
    composition.rank1Children.forEach(child => {
      if (child.isDeceased && child.representatives) {
        count += child.representatives.length;
      } else if (!child.isDeceased) {
        count += 1;
      }
    });
  } else if (composition.selectedRank === 'rank2') {
    // 第2順位：直系尊属
    count += composition.rank2Ascendants.length;
  } else if (composition.selectedRank === 'rank3') {
    // 第3順位：兄弟姉妹（代襲相続人含む）
    composition.rank3Siblings.forEach(sibling => {
      if (sibling.isDeceased && sibling.representatives) {
        count += sibling.representatives.length;
      } else if (!sibling.isDeceased) {
        count += 1;
      }
    });
  }

  return count;
}

/**
 * 有効な相続人のランクと人数を取得
 */
function getActiveHeirRank(composition: HeirComposition): { rank: number; count: number; childrenCount: number } {
  // 選択された順位に基づいて相続人数を計算
  if (composition.selectedRank === 'rank1') {
    let rank1Count = 0;
    composition.rank1Children.forEach(child => {
      if (child.isDeceased && child.representatives) {
        rank1Count += child.representatives.length;
      } else if (!child.isDeceased) {
        rank1Count += 1;
      }
    });
    return { rank: 1, count: rank1Count, childrenCount: rank1Count };
  } else if (composition.selectedRank === 'rank2') {
    return { rank: 2, count: composition.rank2Ascendants.length, childrenCount: 0 };
  } else if (composition.selectedRank === 'rank3') {
    let rank3Count = 0;
    composition.rank3Siblings.forEach(sibling => {
      if (sibling.isDeceased && sibling.representatives) {
        rank3Count += sibling.representatives.length;
      } else if (!sibling.isDeceased) {
        rank3Count += 1;
      }
    });
    return { rank: 3, count: rank3Count, childrenCount: 0 };
  }

  // 選択なし
  return { rank: 0, count: 0, childrenCount: 0 };
}

/**
 * 相続税を計算
 */
export function calculateInheritanceTax(
  estateValue: number, // 相続財産額（万円）
  composition: HeirComposition
): TaxCalculationResult {
  // 1. 基礎控除額の計算: 3,000万円 + (600万円 × 法定相続人の数)
  const totalHeirs = countTotalHeirs(composition);
  const basicDeduction = 3000 + (600 * totalHeirs);

  // 2. 課税遺産総額
  const taxableAmount = Math.max(0, estateValue - basicDeduction);

  if (taxableAmount === 0) {
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

  // 3. 有効な相続人のランクと人数を取得
  const { rank, count: childrenCount } = getActiveHeirRank(composition);

  // 4. 法定相続分の計算
  let spouseShare = 0;
  let childrenTotalShare = 0;

  if (composition.hasSpouse && childrenCount > 0) {
    // 配偶者と第1順位（子・代襲相続人）: 配偶者1/2、子1/2
    spouseShare = taxableAmount * 0.5;
    childrenTotalShare = taxableAmount * 0.5;
  } else if (composition.hasSpouse && rank === 2) {
    // 配偶者と第2順位（直系尊属）: 配偶者2/3、直系尊属1/3
    spouseShare = taxableAmount * (2 / 3);
    childrenTotalShare = taxableAmount * (1 / 3);
  } else if (composition.hasSpouse && rank === 3) {
    // 配偶者と第3順位（兄弟姉妹）: 配偶者3/4、兄弟姉妹1/4
    spouseShare = taxableAmount * 0.75;
    childrenTotalShare = taxableAmount * 0.25;
  } else if (!composition.hasSpouse && childrenCount > 0) {
    // 子のみ
    childrenTotalShare = taxableAmount;
  } else {
    // その他（直系尊属のみ、兄弟姉妹のみ）
    childrenTotalShare = taxableAmount;
  }

  // 5. 各相続人の法定相続分に応じた税額計算
  let totalTax = 0;

  // 配偶者の税額
  if (spouseShare > 0) {
    totalTax += calculateTaxForShare(spouseShare);
  }

  // 子・代襲相続人・その他相続人の税額
  if (childrenCount > 0) {
    const perPersonShare = childrenTotalShare / childrenCount;
    const taxPerPerson = calculateTaxForShare(perPersonShare);

    // 第3順位（兄弟姉妹）の場合は2割加算
    if (rank === 3) {
      totalTax += Math.floor(taxPerPerson * childrenCount * 1.2);
    } else {
      totalTax += taxPerPerson * childrenCount;
    }
  }

  // 6. 配偶者控除後の税額（簡易計算：配偶者の法定相続分までは非課税とする）
  const taxAfterSpouseDeduction = composition.hasSpouse
    ? Math.floor(totalTax * 0.5)
    : totalTax;

  // 7. 実効税率
  const effectiveTaxRate = (totalTax / estateValue) * 100;
  const effectiveTaxRateAfterSpouse = (taxAfterSpouseDeduction / estateValue) * 100;

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

/**
 * 相続税計算フック
 */
export function useTaxCalculator(composition: HeirComposition) {
  const calculator = useMemo(() => {
    return (estateValue: number) => calculateInheritanceTax(estateValue, composition);
  }, [composition]);

  return calculator;
}
