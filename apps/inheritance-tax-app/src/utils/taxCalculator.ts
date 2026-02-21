import type {
  HeirComposition,
  HeirType,
  TaxCalculationResult,
  SpouseAcquisitionMode,
  HeirTaxBreakdown,
  SpouseDeductionDetail,
  DetailedTaxCalculationResult,
} from '../types';
import {
  TAX_BRACKETS,
  BASIC_DEDUCTION,
  THIRD_RANK_SURCHARGE_RATE,
  SHARE_RATIOS,
  SPOUSE_DEDUCTION_LIMIT,
} from '../constants';
import { getHeirInfo, getHeirLabel } from './heirUtils';

/**
 * 法定相続分の割合を取得
 */
function getLegalShareRatios(hasSpouse: boolean, rank: number): { spouse: number; others: number } {
  if (hasSpouse) {
    const ratios = SHARE_RATIOS[rank];
    return ratios ? { spouse: ratios.spouse, others: ratios.others } : { spouse: 1.0, others: 0 };
  }
  return { spouse: 0, others: 1.0 };
}

/**
 * 基礎控除額を計算
 */
function calculateBasicDeduction(totalHeirsCount: number): number {
  return totalHeirsCount > 0
    ? BASIC_DEDUCTION.BASE + (BASIC_DEDUCTION.PER_HEIR * totalHeirsCount)
    : BASIC_DEDUCTION.BASE;
}

/** 順位→相続人種別 */
const RANK_TO_HEIR_TYPE: Record<number, HeirType> = { 1: 'child', 2: 'parent', 3: 'sibling' };

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

  // 2. 基礎控除額の計算
  const basicDeduction = calculateBasicDeduction(totalHeirsCount);

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
  const { spouse: spouseShareRatio, others: otherShareRatio } = getLegalShareRatios(composition.hasSpouse, rank);

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

/**
 * 詳細な相続税計算（計算ページ用）
 */
export function calculateDetailedInheritanceTax(
  estateValue: number,
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode
): DetailedTaxCalculationResult {
  const { rank, totalHeirsCount, rankHeirsCount } = getHeirInfo(composition);

  const basicDeduction = calculateBasicDeduction(totalHeirsCount);

  const taxableAmount = Math.max(0, estateValue - basicDeduction);

  if (taxableAmount === 0 || totalHeirsCount === 0) {
    return {
      estateValue,
      basicDeduction,
      taxableAmount: 0,
      totalTax: 0,
      heirBreakdowns: [],
      spouseDeductionDetail: null,
      totalFinalTax: 0,
      effectiveTaxRate: 0,
    };
  }

  // 法定相続分の割合
  const { spouse: spouseLegalRatio, others: othersLegalRatio } = getLegalShareRatios(composition.hasSpouse, rank);

  // 相続税の総額を算出（法定相続分ベース）
  const breakdowns: HeirTaxBreakdown[] = [];

  // 配偶者
  if (composition.hasSpouse) {
    const legalShareAmount = Math.floor(taxableAmount * spouseLegalRatio);
    breakdowns.push({
      label: '配偶者',
      type: 'spouse',
      legalShareRatio: spouseLegalRatio,
      legalShareAmount,
      taxOnShare: calculateTaxForShare(legalShareAmount),
      acquisitionAmount: 0,
      proportionalTax: 0,
      surchargeAmount: 0,
      spouseDeduction: 0,
      finalTax: 0,
    });
  }

  // 他の相続人
  if (othersLegalRatio > 0 && rankHeirsCount > 0) {
    const perPersonRatio = othersLegalRatio / rankHeirsCount;
    const othersTotalAmount = Math.floor(taxableAmount * othersLegalRatio);
    const perPersonAmount = Math.floor(othersTotalAmount / rankHeirsCount);

    const heirType = RANK_TO_HEIR_TYPE[rank] || 'sibling';

    for (let i = 0; i < rankHeirsCount; i++) {
      breakdowns.push({
        label: getHeirLabel(heirType, i, rankHeirsCount),
        type: heirType,
        legalShareRatio: perPersonRatio,
        legalShareAmount: perPersonAmount,
        taxOnShare: calculateTaxForShare(perPersonAmount),
        acquisitionAmount: 0,
        proportionalTax: 0,
        surchargeAmount: 0,
        spouseDeduction: 0,
        finalTax: 0,
      });
    }
  }

  // 相続税の総額
  const totalTax = breakdowns.reduce((sum, b) => sum + b.taxOnShare, 0);

  // 実際の取得割合を計算
  const spouseIdx = breakdowns.findIndex(b => b.type === 'spouse');
  const otherIndices = breakdowns.map((_, i) => i).filter(i => i !== spouseIdx);

  if (spouseIdx >= 0) {
    let spouseAcquisitionAmount: number;

    if (spouseMode.mode === 'legal') {
      spouseAcquisitionAmount = Math.floor(estateValue * spouseLegalRatio);
    } else if (spouseMode.mode === 'limit160m') {
      spouseAcquisitionAmount = Math.min(estateValue, SPOUSE_DEDUCTION_LIMIT);
    } else {
      spouseAcquisitionAmount = Math.min(spouseMode.value, estateValue);
    }

    breakdowns[spouseIdx].acquisitionAmount = spouseAcquisitionAmount;

    // 残りを他の相続人で均等割
    const remaining = estateValue - spouseAcquisitionAmount;
    const otherCount = otherIndices.length;
    if (otherCount > 0) {
      const perPerson = Math.floor(remaining / otherCount);
      for (const idx of otherIndices) {
        breakdowns[idx].acquisitionAmount = perPerson;
      }
    }
  } else {
    // 配偶者なし: 全員均等
    const perPerson = Math.floor(estateValue / breakdowns.length);
    for (const b of breakdowns) {
      b.acquisitionAmount = perPerson;
    }
  }

  // 按分税額の計算
  for (const b of breakdowns) {
    b.proportionalTax = estateValue > 0
      ? Math.floor(totalTax * (b.acquisitionAmount / estateValue))
      : 0;
  }

  // 2割加算（rank3の相続人）
  if (rank === 3) {
    for (const idx of otherIndices) {
      breakdowns[idx].surchargeAmount = Math.floor(
        breakdowns[idx].proportionalTax * 0.2
      );
    }
  }

  // 配偶者の税額軽減
  let spouseDeductionDetail: SpouseDeductionDetail | null = null;

  if (spouseIdx >= 0) {
    const spouse = breakdowns[spouseIdx];
    const legalShareOfEstate = Math.floor(estateValue * spouseLegalRatio);
    const deductionLimit = Math.max(legalShareOfEstate, SPOUSE_DEDUCTION_LIMIT);
    const taxBeforeDeduction = spouse.proportionalTax + spouse.surchargeAmount;

    let actualDeduction: number;
    if (spouse.acquisitionAmount <= deductionLimit) {
      actualDeduction = taxBeforeDeduction;
    } else {
      actualDeduction = Math.floor(
        totalTax * (deductionLimit / estateValue)
      );
      actualDeduction = Math.min(actualDeduction, taxBeforeDeduction);
    }

    spouse.spouseDeduction = actualDeduction;

    spouseDeductionDetail = {
      acquisitionAmount: spouse.acquisitionAmount,
      legalShareAmount: legalShareOfEstate,
      limit160m: SPOUSE_DEDUCTION_LIMIT,
      deductionLimit,
      taxBeforeDeduction,
      actualDeduction,
    };
  }

  // 最終税額
  for (const b of breakdowns) {
    b.finalTax = Math.max(
      0,
      b.proportionalTax + b.surchargeAmount - b.spouseDeduction
    );
  }

  const totalFinalTax = breakdowns.reduce((sum, b) => sum + b.finalTax, 0);
  const effectiveTaxRate = estateValue > 0
    ? (totalFinalTax / estateValue) * 100 : 0;

  return {
    estateValue,
    basicDeduction,
    taxableAmount,
    totalTax,
    heirBreakdowns: breakdowns,
    spouseDeductionDetail,
    totalFinalTax,
    effectiveTaxRate,
  };
}
