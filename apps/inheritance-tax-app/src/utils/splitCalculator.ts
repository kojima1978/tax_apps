import type {
  HeirComposition,
  HeirAcquisition,
  SplitSimulationRow,
  SplitSimulationResult,
} from '../types';
import { SPOUSE_DEDUCTION_LIMIT } from '../constants';
import { getHeirInfo, getHeirLabel } from './heirUtils';
import { getLegalShareRatios, calculateBasicDeduction, calculateTaxForShare, RANK_TO_HEIR_TYPE } from './taxCore';

/**
 * 相続人構成から相続人ラベル一覧を生成
 */
export function buildHeirLabels(composition: HeirComposition): { label: string; type: HeirType }[] {
  const result: { label: string; type: HeirType }[] = [];
  const { rank, rankHeirsCount } = getHeirInfo(composition);

  if (composition.hasSpouse) {
    result.push({ label: '配偶者', type: 'spouse' });
  }

  if (rank > 0 && rankHeirsCount > 0) {
    const heirType = RANK_TO_HEIR_TYPE[rank] || 'sibling';
    for (let i = 0; i < rankHeirsCount; i++) {
      result.push({
        label: getHeirLabel(heirType, i, rankHeirsCount),
        type: heirType,
      });
    }
  }

  return result;
}

/**
 * 法定相続分に基づく各相続人の取得額を計算
 */
export function calculateLegalAcquisitions(
  estateValue: number,
  composition: HeirComposition,
): number[] {
  const { rank, rankHeirsCount } = getHeirInfo(composition);
  const labels = buildHeirLabels(composition);
  const { spouse: spouseRatio, others: othersRatio } = getLegalShareRatios(composition.hasSpouse, rank);

  return labels.map(h => {
    if (h.type === 'spouse') {
      return Math.floor(estateValue * spouseRatio);
    }
    if (othersRatio > 0 && rankHeirsCount > 0) {
      return Math.floor(Math.floor(estateValue * othersRatio) / rankHeirsCount);
    }
    return 0;
  });
}

/**
 * 任意の取得額配分で各相続人の税額を計算
 *
 * 相続税の総額は法定相続分ベースで算出（固定）。
 * 取得額に応じて按分 → 2割加算 → 配偶者控除 → 最終税額を計算。
 */
export function calculateSplitTax(
  estateValue: number,
  composition: HeirComposition,
  acquisitions: number[],
): { totalTax: number; basicDeduction: number; taxableAmount: number; finalTaxes: number[] } {
  const { rank, totalHeirsCount, rankHeirsCount } = getHeirInfo(composition);
  const basicDeduction = calculateBasicDeduction(totalHeirsCount);

  const taxableAmount = Math.max(0, estateValue - basicDeduction);

  if (taxableAmount === 0 || totalHeirsCount === 0) {
    return { totalTax: 0, basicDeduction, taxableAmount, finalTaxes: acquisitions.map(() => 0) };
  }

  // 法定相続分ベースで相続税の総額を算出
  const { spouse: spouseRatio, others: othersRatio } = getLegalShareRatios(composition.hasSpouse, rank);

  let totalTax = 0;
  if (spouseRatio > 0) {
    totalTax += calculateTaxForShare(Math.floor(taxableAmount * spouseRatio));
  }
  if (othersRatio > 0 && rankHeirsCount > 0) {
    const perPerson = Math.floor(Math.floor(taxableAmount * othersRatio) / rankHeirsCount);
    totalTax += calculateTaxForShare(perPerson) * rankHeirsCount;
  }

  // 按分税額の計算
  const totalAcquisition = acquisitions.reduce((s, a) => s + a, 0);
  const denominator = totalAcquisition > 0 ? totalAcquisition : estateValue;

  const proportionalTaxes = acquisitions.map(a =>
    denominator > 0 ? Math.floor(totalTax * (a / denominator)) : 0
  );

  // 2割加算（rank3）
  const surcharges = acquisitions.map(() => 0);
  const heirLabels = buildHeirLabels(composition);
  if (rank === 3) {
    for (let i = 0; i < heirLabels.length; i++) {
      if (heirLabels[i].type !== 'spouse') {
        surcharges[i] = Math.floor(proportionalTaxes[i] * 0.2);
      }
    }
  }

  // 配偶者控除
  const spouseDeductions = acquisitions.map(() => 0);
  if (composition.hasSpouse) {
    const spouseIdx = heirLabels.findIndex(h => h.type === 'spouse');
    if (spouseIdx >= 0) {
      const spouseAcq = acquisitions[spouseIdx];
      const legalShareOfEstate = Math.floor(estateValue * spouseRatio);
      const deductionLimit = Math.max(legalShareOfEstate, SPOUSE_DEDUCTION_LIMIT);
      const taxBeforeDeduction = proportionalTaxes[spouseIdx] + surcharges[spouseIdx];

      if (spouseAcq <= deductionLimit) {
        spouseDeductions[spouseIdx] = taxBeforeDeduction;
      } else {
        const calc = Math.floor(totalTax * (deductionLimit / denominator));
        spouseDeductions[spouseIdx] = Math.min(calc, taxBeforeDeduction);
      }
    }
  }

  // 最終税額
  const finalTaxes = acquisitions.map((_, i) =>
    Math.max(0, proportionalTaxes[i] + surcharges[i] - spouseDeductions[i])
  );

  return { totalTax, basicDeduction, taxableAmount, finalTaxes };
}

/**
 * シミュレーション表を生成
 *
 * 各相続人の基準取得額と増減額/行を元に、上下 rowCount 行のシナリオを生成。
 * 自動調整対象の相続人は、他の増減分を吸収して合計 = 遺産総額を維持。
 * 取得額がマイナスになる行は除外。
 */
export function generateSplitSimulation(
  estateValue: number,
  composition: HeirComposition,
  heirAcquisitions: HeirAcquisition[],
  rowCount: number,
): SplitSimulationResult {
  const { totalTax, basicDeduction, taxableAmount } = calculateSplitTax(
    estateValue,
    composition,
    heirAcquisitions.map(h => h.amount),
  );

  const heirLabels = heirAcquisitions.map(h => h.label);
  const rows: SplitSimulationRow[] = [];

  for (let n = rowCount; n >= -rowCount; n--) {
    const acquisitions = heirAcquisitions.map(h => {
      if (h.isAutoAdjust) return 0; // 後で計算
      return h.amount + h.step * n;
    });

    // 自動調整対象の取得額 = 遺産総額 - 他の合計
    const autoIdx = heirAcquisitions.findIndex(h => h.isAutoAdjust);
    if (autoIdx >= 0) {
      const othersTotal = acquisitions.reduce((s, a, i) => i === autoIdx ? s : s + a, 0);
      acquisitions[autoIdx] = estateValue - othersTotal;
    }

    // 誰かの取得額がマイナスなら除外
    if (acquisitions.some(a => a < 0)) continue;

    const { finalTaxes } = calculateSplitTax(estateValue, composition, acquisitions);

    rows.push({
      rowIndex: n,
      acquisitions,
      finalTaxes,
      totalFinalTax: finalTaxes.reduce((s, t) => s + t, 0),
      isBase: n === 0,
    });
  }

  // 法定相続分による分割行
  const legalAcquisitions = calculateLegalAcquisitions(estateValue, composition);
  const { finalTaxes: legalTaxes } = calculateSplitTax(estateValue, composition, legalAcquisitions);
  const legalRow: SplitSimulationRow = {
    rowIndex: 0,
    acquisitions: legalAcquisitions,
    finalTaxes: legalTaxes,
    totalFinalTax: legalTaxes.reduce((s, t) => s + t, 0),
    isBase: false,
  };

  return {
    estateValue,
    basicDeduction,
    taxableAmount,
    totalTax,
    heirLabels,
    legalRow,
    rows,
  };
}
