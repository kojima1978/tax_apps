import { RATE_TABLE } from '@/data/rateTable';
import type { Asset, AssetCategory, EvaluationBasis } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { formatYen } from '@/utils/formatters';

/** 経過年数を計算（1年未満切上） */
export function calcElapsedYears(
  taxDate: string,
  acquisitionDate: string
): number {
  const tax = new Date(taxDate).getTime();
  const acq = new Date(acquisitionDate).getTime();
  if (isNaN(tax) || isNaN(acq)) return 0;
  const diffDays = (tax - acq) / (1000 * 60 * 60 * 24);
  return Math.ceil(diffDays / 365);
}

/** 3年以内の基準日を算出 */
export function calcWithin3YearsDate(taxDate: string): Date {
  const d = new Date(taxDate);
  d.setDate(d.getDate() - 365 * 3);
  return d;
}

/** 3年以内判定 */
export function isWithin3Years(
  taxDate: string,
  acquisitionDate: string
): boolean {
  const acq = new Date(acquisitionDate).getTime();
  if (isNaN(acq)) return false;
  return acq > calcWithin3YearsDate(taxDate).getTime();
}

/** 未償却残額割合を取得 */
export function getUndepreciatedRate(
  elapsedYears: number,
  usefulLife: number
): number {
  if (elapsedYears >= usefulLife) return 0;
  if (elapsedYears <= 0) return 1;
  const row = RATE_TABLE[elapsedYears];
  if (!row) return 0;
  return row[usefulLife] ?? 0;
}

/** 建物の定額法償却額を計算 */
function calcBuildingDepreciation(
  acquisitionCost: number,
  elapsedYears: number,
  usefulLife: number
): number {
  if (elapsedYears >= usefulLife) {
    return acquisitionCost * 0.9;
  }
  return acquisitionCost * 0.9 * (elapsedYears / usefulLife);
}

/** カテゴリに応じた償却額/償却率を取得 */
function getDepRate(
  category: AssetCategory,
  acquisitionCost: number,
  elapsed: number,
  usefulLife: number
): number {
  return category === '建物'
    ? calcBuildingDepreciation(acquisitionCost, elapsed, usefulLife)
    : getUndepreciatedRate(elapsed, usefulLife);
}

type CalcResult = Pick<
  Asset,
  | 'elapsedYears'
  | 'depreciationAmountOrRate'
  | 'evaluationAmount'
  | 'evaluationBasis'
  | 'isWithin3Years'
>;

type AssetInput = Omit<Asset, keyof CalcResult>;

/** 資産の評価額を計算 */
export function calculateAsset(asset: AssetInput, taxDate: string): CalcResult {
  const config = CATEGORY_CONFIG[asset.category];
  const elapsed = calcElapsedYears(taxDate, asset.acquisitionDate);
  const within3 = config.hasWithin3Years
    ? isWithin3Years(taxDate, asset.acquisitionDate)
    : false;

  // 固定資産税評価明細あり
  if (asset.hasFixedAssetTaxRecord && config.hasFixedAssetTaxRecord) {
    return {
      elapsedYears: elapsed,
      depreciationAmountOrRate: getDepRate(asset.category, asset.acquisitionCost, elapsed, asset.usefulLife),
      evaluationAmount: null,
      evaluationBasis: '固定資産税評価明細',
      isWithin3Years: within3,
    };
  }

  // 3年以内 → 簿価
  if (within3 && config.hasWithin3Years) {
    return {
      elapsedYears: elapsed,
      depreciationAmountOrRate: getDepRate(asset.category, asset.acquisitionCost, elapsed, asset.usefulLife),
      evaluationAmount: asset.bookValue,
      evaluationBasis: '3年内_簿価',
      isWithin3Years: within3,
    };
  }

  // 財産性なし（評価額0）
  if (asset.category === '無形固定資産' || asset.category === '繰延資産') {
    return {
      elapsedYears: elapsed,
      depreciationAmountOrRate: 0,
      evaluationAmount: 0,
      evaluationBasis: '財産性なし',
      isWithin3Years: false,
    };
  }

  // 一括償却資産 → 簿価
  if (asset.category === '一括償却資産') {
    return {
      elapsedYears: elapsed,
      depreciationAmountOrRate: 0,
      evaluationAmount: asset.bookValue,
      evaluationBasis: '簿価',
      isWithin3Years: false,
    };
  }

  // カテゴリ別計算
  return calculateByCategory(asset, taxDate, elapsed, within3);
}

function calculateByCategory(
  asset: AssetInput,
  _taxDate: string,
  elapsed: number,
  within3: boolean
): CalcResult {
  const config = CATEGORY_CONFIG[asset.category];
  let evaluationBasis: EvaluationBasis;
  let depreciationAmountOrRate: number;
  let evaluationAmount: number;

  if (asset.category === '建物') {
    // 定額法
    const depAmount = calcBuildingDepreciation(
      asset.acquisitionCost,
      elapsed,
      asset.usefulLife
    );
    evaluationAmount = Math.floor(
      (asset.acquisitionCost - depAmount) * 0.7
    );
    depreciationAmountOrRate = depAmount;
    evaluationBasis = '評基通89－2(2)';
  } else {
    // 定率法
    const rate = getUndepreciatedRate(elapsed, asset.usefulLife);
    depreciationAmountOrRate = rate;

    if (config.multiply07) {
      evaluationAmount = Math.floor(asset.acquisitionCost * rate * 0.7);
    } else {
      evaluationAmount = Math.floor(asset.acquisitionCost * rate);
    }

    evaluationBasis = getEvaluationBasis(asset.category);
  }

  // 賃貸控除
  if (asset.isRental && config.hasRental) {
    evaluationAmount = Math.floor(evaluationAmount * 0.7);
  }

  return {
    elapsedYears: elapsed,
    depreciationAmountOrRate,
    evaluationAmount,
    evaluationBasis,
    isWithin3Years: within3,
  };
}

function getEvaluationBasis(category: AssetCategory): EvaluationBasis {
  switch (category) {
    case '建物付属設備':
      return '評基通92';
    case '構築物':
      return '評基通97';
    default:
      return '評基通129';
  }
}

/** 計算根拠テキストを生成 */
export function getCalculationTooltip(asset: Asset): string {
  if (asset.evaluationAmount === null) {
    return '固定資産税評価明細による評価';
  }

  if (asset.evaluationBasis === '3年内_簿価') {
    return `3年以内取得のため期末簿価を使用: ${formatYen(asset.bookValue)}`;
  }

  if (asset.evaluationBasis === '財産性なし') {
    return '財産性なし（評価額0円）';
  }

  if (asset.evaluationBasis === '簿価') {
    return `一括償却資産のため期末簿価を使用: ${formatYen(asset.bookValue)}`;
  }

  const config = CATEGORY_CONFIG[asset.category];
  let text: string;

  if (asset.category === '建物') {
    const dep = asset.depreciationAmountOrRate;
    const base = asset.acquisitionCost - dep;
    text = `${asset.evaluationBasis}: (${formatYen(asset.acquisitionCost)} - ${formatYen(Math.floor(dep))}) × 0.7 = ${formatYen(Math.floor(base * 0.7))}`;
  } else {
    const rate = asset.depreciationAmountOrRate;
    if (config.multiply07) {
      text = `${asset.evaluationBasis}: ${formatYen(asset.acquisitionCost)} × ${rate} × 0.7 = ${formatYen(Math.floor(asset.acquisitionCost * rate * 0.7))}`;
    } else {
      text = `${asset.evaluationBasis}: ${formatYen(asset.acquisitionCost)} × ${rate} = ${formatYen(Math.floor(asset.acquisitionCost * rate))}`;
    }
  }

  text += `\n経過年数${asset.elapsedYears}年 / 耐用年数${asset.usefulLife}年`;

  if (asset.isRental && config.hasRental) {
    text += `\n賃貸控除: × 0.7（借家権割合30%控除）`;
  }

  return text;
}
