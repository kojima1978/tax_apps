import type {
  HeirComposition,
  TaxCalculationResult,
  SpouseAcquisitionMode,
  HeirTaxBreakdown,
  SpouseDeductionDetail,
  DetailedTaxCalculationResult,
} from '../types';
import {
  TAX_BRACKETS,
  THIRD_RANK_SURCHARGE_RATE,
  SPOUSE_DEDUCTION_LIMIT,
} from '../constants';
import { getHeirInfo, getEffectiveHeirShares } from './heirUtils';
import { getLegalShareRatios, calculateBasicDeduction, calculateTaxForShare } from './taxCore';

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
  // 代襲相続人は被代襲者の取り分を均等分割する
  if (otherShareRatio > 0 && rankHeirsCount > 0) {
    const shares = getEffectiveHeirShares(composition);
    let othersTax = 0;
    for (const share of shares) {
      const shareAmount = Math.floor(taxableAmount * otherShareRatio * share.ratio);
      othersTax += calculateTaxForShare(shareAmount);
    }

    // 第3順位（兄弟姉妹）の場合は2割加算
    // ※代襲相続人（甥姪）も2割加算
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

  // 7. 相続税負担率
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
 * 法定相続分に対するブラケット税率を取得
 */
function getBracketRate(shareAmount: number): number {
  if (shareAmount <= 0) return 0;
  const bracket = TAX_BRACKETS.find(b => shareAmount <= b.threshold) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  return bracket.rate;
}

/**
 * 加重平均適用税率の分析結果
 */
export interface BracketAnalysisRow {
  estateValue: number;
  spouseRate: number | null;
  otherRate: number;
  weightedRate: number;
  weightedRateAfterSpouse: number;
}

/**
 * 各法定相続人のブラケット税率を取得し、加重平均を算出する。
 * 「財産が増えたとき税がどれだけ増えるか」を表す限界税率の近似値。
 */
export function calculateBracketAnalysis(
  estateValue: number,
  composition: HeirComposition,
): BracketAnalysisRow {
  const { rank, totalHeirsCount, rankHeirsCount } = getHeirInfo(composition);
  const basicDeduction = calculateBasicDeduction(totalHeirsCount);
  const taxableAmount = Math.max(0, estateValue - basicDeduction);

  if (taxableAmount === 0 || totalHeirsCount === 0) {
    return { estateValue, spouseRate: composition.hasSpouse ? 0 : null, otherRate: 0, weightedRate: 0, weightedRateAfterSpouse: 0 };
  }

  const { spouse: spouseRatio, others: othersRatio } = getLegalShareRatios(composition.hasSpouse, rank);
  const surcharge = rank === 3 ? THIRD_RANK_SURCHARGE_RATE : 1;

  // 配偶者
  const spouseRate = spouseRatio > 0
    ? getBracketRate(Math.floor(taxableAmount * spouseRatio))
    : null;

  // 他の相続人（代襲相続考慮：個別割合で加重平均）
  let otherRate = 0;
  if (othersRatio > 0 && rankHeirsCount > 0) {
    const shares = getEffectiveHeirShares(composition);
    for (const share of shares) {
      const shareAmount = Math.floor(taxableAmount * othersRatio * share.ratio);
      otherRate += getBracketRate(shareAmount) * share.ratio;
    }
  }

  // 加重平均（全体）
  const weightedRate = (spouseRate ?? 0) * spouseRatio + otherRate * othersRatio * surcharge;

  // 配偶者控除後（配偶者分を除く）
  const weightedRateAfterSpouse = otherRate * othersRatio * surcharge;

  return { estateValue, spouseRate, otherRate, weightedRate, weightedRateAfterSpouse };
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

  // 他の相続人（代襲相続考慮）
  if (othersLegalRatio > 0 && rankHeirsCount > 0) {
    const shares = getEffectiveHeirShares(composition);
    for (const share of shares) {
      const legalShareRatio = othersLegalRatio * share.ratio;
      const legalShareAmount = Math.floor(taxableAmount * legalShareRatio);
      breakdowns.push({
        label: share.label,
        type: share.type,
        legalShareRatio,
        legalShareAmount,
        taxOnShare: calculateTaxForShare(legalShareAmount),
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
      const customAmount = spouseMode.unit === 'percent'
        ? Math.floor(estateValue * spouseMode.value / 100)
        : spouseMode.value;
      spouseAcquisitionAmount = Math.min(customAmount, estateValue);
    }

    breakdowns[spouseIdx].acquisitionAmount = spouseAcquisitionAmount;

    // 残りを他の相続人で法定相続分の割合で配分
    const remaining = estateValue - spouseAcquisitionAmount;
    const othersLegalTotal = otherIndices.reduce((sum, idx) => sum + breakdowns[idx].legalShareRatio, 0);
    if (othersLegalTotal > 0) {
      for (const idx of otherIndices) {
        breakdowns[idx].acquisitionAmount = Math.floor(remaining * breakdowns[idx].legalShareRatio / othersLegalTotal);
      }
    }
  } else {
    // 配偶者なし: 法定相続分の割合で配分
    const totalRatio = breakdowns.reduce((sum, b) => sum + b.legalShareRatio, 0);
    for (const b of breakdowns) {
      b.acquisitionAmount = totalRatio > 0
        ? Math.floor(estateValue * b.legalShareRatio / totalRatio)
        : Math.floor(estateValue / breakdowns.length);
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
    ? (totalTax / estateValue) * 100 : 0;

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
