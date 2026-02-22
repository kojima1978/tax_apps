import type {
  HeirComposition,
  SpouseAcquisitionMode,
  HeirTaxBreakdown,
  DetailedTaxCalculationResult,
  SpouseDeductionDetail,
} from '../types';
import { SHARE_RATIOS, SPOUSE_DEDUCTION_LIMIT } from '../constants';
import { getHeirInfo } from './heirUtils';

/**
 * 相続税の按分を再計算する共通ユーティリティ。
 *
 * Insurance（受取人帰属モデル）と Gift（受贈者帰属モデル）で共通の
 * 按分ロジック（基本取得額計算 → 2割加算 → 配偶者控除 → 最終税額）を統合。
 *
 * @param taxResult 元の詳細税額計算結果
 * @param baseEstate 元の遺産額
 * @param composition 相続人構成
 * @param spouseMode 配偶者取得割合モード
 * @param adjustAcquisitions 基本取得額計算後にモデル固有の調整を行うコールバック
 * @param getDenominator 按分計算の分母を返すコールバック
 */
export function reapportionTax(
  taxResult: DetailedTaxCalculationResult,
  baseEstate: number,
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode,
  adjustAcquisitions: (breakdowns: HeirTaxBreakdown[]) => void,
  getDenominator: (breakdowns: HeirTaxBreakdown[]) => number,
): DetailedTaxCalculationResult {
  const breakdowns = taxResult.heirBreakdowns.map(b => ({ ...b }));
  if (breakdowns.length === 0) return taxResult;

  const { rank } = getHeirInfo(composition);
  const hasSpouse = composition.hasSpouse;

  // 法定相続分の割合
  const ratios = hasSpouse && SHARE_RATIOS[rank]
    ? SHARE_RATIOS[rank]
    : hasSpouse ? { spouse: 1.0, others: 0 } : null;
  const spouseLegalRatio = ratios ? ratios.spouse : 0;

  const spouseIdx = breakdowns.findIndex(b => b.type === 'spouse');
  const otherIndices = breakdowns.map((_, i) => i).filter(i => i !== spouseIdx);

  // 1. 元の遺産ベースで各相続人の基本取得額を計算
  if (spouseIdx >= 0) {
    let spouseBase: number;
    if (spouseMode.mode === 'legal') {
      spouseBase = Math.floor(baseEstate * spouseLegalRatio);
    } else if (spouseMode.mode === 'limit160m') {
      spouseBase = Math.min(baseEstate, SPOUSE_DEDUCTION_LIMIT);
    } else {
      spouseBase = Math.min(spouseMode.value, baseEstate);
    }
    breakdowns[spouseIdx].acquisitionAmount = spouseBase;

    const remaining = baseEstate - spouseBase;
    const otherCount = otherIndices.length;
    if (otherCount > 0) {
      const perPerson = Math.floor(remaining / otherCount);
      for (const idx of otherIndices) {
        breakdowns[idx].acquisitionAmount = perPerson;
      }
    }
  } else {
    const perPerson = Math.floor(baseEstate / breakdowns.length);
    for (let i = 0; i < breakdowns.length; i++) {
      breakdowns[i].acquisitionAmount = perPerson;
    }
  }

  // 2. モデル固有の取得額調整（保険料控除+課税保険金 or 贈与額控除）
  adjustAcquisitions(breakdowns);

  // 3. 按分税額の再計算
  const { totalTax } = taxResult;
  const denominator = getDenominator(breakdowns);
  for (const b of breakdowns) {
    b.proportionalTax = denominator > 0
      ? Math.floor(totalTax * (b.acquisitionAmount / denominator))
      : 0;
  }

  // 4. 2割加算（rank3）
  for (const b of breakdowns) {
    b.surchargeAmount = 0;
  }
  if (rank === 3) {
    for (const idx of otherIndices) {
      breakdowns[idx].surchargeAmount = Math.floor(breakdowns[idx].proportionalTax * 0.2);
    }
  }

  // 5. 配偶者の税額軽減
  let spouseDeductionDetail: SpouseDeductionDetail | null = null;
  if (spouseIdx >= 0) {
    breakdowns[spouseIdx].spouseDeduction = 0;
    const spouse = breakdowns[spouseIdx];
    const legalShareOfEstate = Math.floor(denominator * spouseLegalRatio);
    const deductionLimit = Math.max(legalShareOfEstate, SPOUSE_DEDUCTION_LIMIT);
    const taxBeforeDeduction = spouse.proportionalTax + spouse.surchargeAmount;

    let actualDeduction: number;
    if (spouse.acquisitionAmount <= deductionLimit) {
      actualDeduction = taxBeforeDeduction;
    } else {
      actualDeduction = Math.floor(totalTax * (deductionLimit / denominator));
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

  // 6. 最終税額
  for (const b of breakdowns) {
    b.finalTax = Math.max(0, b.proportionalTax + b.surchargeAmount - b.spouseDeduction);
  }

  const totalFinalTax = breakdowns.reduce((sum, b) => sum + b.finalTax, 0);
  const effectiveTaxRate = denominator > 0 ? (totalFinalTax / denominator) * 100 : 0;

  return {
    ...taxResult,
    heirBreakdowns: breakdowns,
    spouseDeductionDetail,
    totalFinalTax,
    effectiveTaxRate,
  };
}
