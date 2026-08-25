import type {
  DeemedAssetEntry,
  DeemedAssetHeirAmount,
  DeemedAssetKind,
  DeemedAssetKindSummary,
  DeemedAssetSummary,
  DetailedTaxCalculationResult,
  HeirComposition,
  SpouseAcquisitionMode,
} from '../types';
import { INSURANCE_EXEMPT_PER_HEIR } from '../constants';
import { getHeirInfo, getBeneficiaryOptions } from './heirUtils';
import { calculateDetailedInheritanceTax } from './taxCalculator';
import { reapportionTax } from './reapportionTax';

/**
 * みなし相続財産の種別。
 * 生命保険金と死亡退職金は非課税枠が「500万円 × 法定相続人数」で同額だが、
 * 相続税法12条1項5号・6号の別々の枠なので、種別ごとに独立して計算する。
 */
export const DEEMED_ASSET_KINDS: readonly DeemedAssetKind[] = ['insurance', 'retirement'] as const;

export const DEEMED_ASSET_KIND_LABELS: Record<DeemedAssetKind, string> = {
  insurance: '生命保険金',
  retirement: '死亡退職金',
};

/**
 * 非課税枠を受取額に応じて受取人へ配分する（最大剰余法）。
 *
 * 各人を単純に切り捨てると合計が枠に満たず端数（例: 1,000万円が999万円）が出るため、
 * まず小数部を切り捨て、不足分を小数部の大きい順（同点は受取額の多い順）に
 * 1万円ずつ加算して、合計を実際の非課税額に一致させる。
 * 戻り値は benefits と同じ並び。
 */
export function allocateNonTaxableAmounts(benefits: number[], nonTaxableLimit: number): number[] {
  const totalBenefit = benefits.reduce((sum, benefit) => sum + benefit, 0);
  const actualNonTaxable = Math.min(totalBenefit, nonTaxableLimit);

  const allocations = benefits.map(benefit => {
    const exact = totalBenefit > 0 ? actualNonTaxable * (benefit / totalBenefit) : 0;
    const floor = Math.floor(exact);
    return { benefit, amount: floor, frac: exact - floor };
  });

  let remainder = actualNonTaxable - allocations.reduce((sum, a) => sum + a.amount, 0);
  for (const a of [...allocations].sort((x, y) => (y.frac - x.frac) || (y.benefit - x.benefit))) {
    if (remainder <= 0) break;
    a.amount += 1;
    remainder -= 1;
  }

  return allocations.map(a => a.amount);
}

/**
 * 受取額の入力を集計する。受取額が1件も無ければ null（みなし相続財産なし）。
 *
 * heirAmounts の並びは getBeneficiaryOptions と同じ＝税額計算の heirBreakdowns と同じ順序で、
 * 受取人への帰属はこの添字で対応させる。
 * 相続人構成の変更で宛先を失った入力（beneficiaryId が選択肢に無い行）は集計しない。
 */
export function summarizeDeemedAssets(
  entries: DeemedAssetEntry[],
  composition: HeirComposition,
  baseEstate: number,
): DeemedAssetSummary | null {
  const options = getBeneficiaryOptions(composition);
  const { totalHeirsCount } = getHeirInfo(composition);
  const nonTaxableLimit = INSURANCE_EXEMPT_PER_HEIR * totalHeirsCount;

  const heirAmounts: DeemedAssetHeirAmount[] = options.map(option => ({
    label: option.label,
    totalBenefit: 0,
    nonTaxableAmount: 0,
    taxableAmount: 0,
  }));

  const kinds: DeemedAssetKindSummary[] = [];
  for (const kind of DEEMED_ASSET_KINDS) {
    const benefits = options.map(option => entries
      .filter(entry => entry.kind === kind && entry.beneficiaryId === option.id)
      .reduce((sum, entry) => sum + entry.amount, 0));
    const totalBenefit = benefits.reduce((sum, benefit) => sum + benefit, 0);
    if (totalBenefit <= 0) continue;

    const nonTaxables = allocateNonTaxableAmounts(benefits, nonTaxableLimit);
    benefits.forEach((benefit, index) => {
      heirAmounts[index].totalBenefit += benefit;
      heirAmounts[index].nonTaxableAmount += nonTaxables[index];
      heirAmounts[index].taxableAmount += benefit - nonTaxables[index];
    });

    const nonTaxableAmount = nonTaxables.reduce((sum, amount) => sum + amount, 0);
    kinds.push({
      kind,
      label: DEEMED_ASSET_KIND_LABELS[kind],
      totalBenefit,
      nonTaxableLimit,
      nonTaxableAmount,
      taxableAmount: totalBenefit - nonTaxableAmount,
    });
  }

  if (kinds.length === 0) return null;

  const sumOf = (pick: (kind: DeemedAssetKindSummary) => number) =>
    kinds.reduce((sum, kind) => sum + pick(kind), 0);

  return {
    baseEstate,
    totalBenefit: sumOf(k => k.totalBenefit),
    nonTaxableAmount: sumOf(k => k.nonTaxableAmount),
    taxableAmount: sumOf(k => k.taxableAmount),
    kinds,
    heirAmounts,
  };
}

/**
 * 生命保険金・死亡退職金を含めた相続税を計算する。
 *
 * 保険金・退職金は受取人固有の財産で遺産分割の対象外なので、
 *   ・課税価格の合計額には非課税枠を控除した額を必ず含める（相続税の総額はこれが基準）
 *   ・按分は「保険金等を除いた遺産」を法定相続分で分け、課税対象額は受取人にだけ加算する
 * という受取人帰属モデルで計算する（保険ページと同じ扱い）。
 *
 * 受取額が無ければ従来どおりの計算結果をそのまま返す。
 */
export function calculateTaxWithDeemedAssets(
  estateValue: number,
  composition: HeirComposition,
  spouseMode: SpouseAcquisitionMode,
  entries: DeemedAssetEntry[],
): DetailedTaxCalculationResult {
  const summary = summarizeDeemedAssets(entries, composition, estateValue);
  if (!summary) return calculateDetailedInheritanceTax(estateValue, composition, spouseMode);

  // 課税価格の合計額 = 保険金等を除いた遺産 + 課税対象の保険金等
  const adjustedEstate = estateValue + summary.taxableAmount;
  const baseResult = calculateDetailedInheritanceTax(adjustedEstate, composition, spouseMode);

  const result = reapportionTax(
    baseResult, estateValue, composition, spouseMode,
    // 受取人帰属: 保険金等を除いた遺産の取得額 + 自分が受け取った課税対象額
    (breakdowns) => {
      for (let i = 0; i < breakdowns.length; i++) {
        breakdowns[i].acquisitionAmount += summary.heirAmounts[i]?.taxableAmount ?? 0;
      }
    },
    // 按分の分母は課税価格の合計額
    () => adjustedEstate,
  );

  return { ...result, deemedAssets: summary };
}
