import {
  type DeemedCategory,
  type Position,
  type Snapshot,
  deemedAllocations,
  deemedBenefit,
  deemedConfig,
  deemedInheritanceCategories,
  splitBenefit,
} from "@/lib/portfolio-view";

const JPY_PER_MAN_YEN = 10_000;

/**
 * 明細ごとの相続税負担額を返す関数を作る（資産・負債一覧、資産・負債詳細とその印刷で共通）。
 *
 * 相続税負担額は、相続税総額を「按分基準額 ÷ 正味財産」の率で各明細へ按分する。
 * 相続税は正味財産（資産合計 − 控除対象負債）に課されるため、負債は同率のマイナス（軽減）として扱い、
 * 資産の部と負債の部の差引が相続税総額と一致する。偶発債務はB/S外なので対象外（null）。
 * 率は配偶者の税額軽減を反映する前の相続税の総額（＝概算計算の欄に出ている実効税率）で求める。
 * 明細は誰が取得するかを持たないので、納付税額から求めると配偶者の軽減分が全明細へ薄く広がり、
 * 財産そのものの税負担が実際より軽く見えてしまう。連携計算値が無いときは手動の想定相続税を使う。
 * 生命保険・死亡退職金は課税価格に入るのが解約返戻金ではなく「給付金 − 非課税限度額」なので、按分基準も
 * 課税対象の給付金に揃える（分子の相続税総額が同じ基準で計算されているため）。非課税枠は相続人が
 * 受け取る契約にだけ適用されるので、その給付金で按分する。法定相続人数が分かるのは連携計算値が
 * ある場合だけなので、手動の想定相続税だけのときは解約返戻金ベースのままとする。
 */
export function buildPositionTaxBurden(snapshot: Snapshot, legalHeirNames: ReadonlySet<string>) {
  const assets = snapshot.positions.filter((p) => p.side === "ASSET");
  const liabilities = snapshot.positions.filter((p) => p.side === "LIABILITY" && p.includedInNetWorth);
  const calculation = snapshot.inheritanceTaxCalculation;
  const benefitJpy = (position: Position) => Math.round((deemedBenefit(position) * position.fxRate) / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN;
  // 受取人が複数のときは分数で割り振り、法定相続人が受け取る分だけを非課税枠の対象にする。
  const heirBenefitJpy = (position: Position) => {
    const allocations = deemedAllocations(position);
    const benefits = splitBenefit(benefitJpy(position), allocations, JPY_PER_MAN_YEN);
    return allocations.reduce((sum, allocation, index) => legalHeirNames.has(allocation.recipient.trim()) ? sum + benefits[index] : sum, 0);
  };
  // 非課税枠は生命保険と死亡退職金で別枠なので、按分率も区分ごとに求める。
  const nonTaxableAmounts: Record<DeemedCategory, number> = {
    INSURANCE: calculation?.insuranceNonTaxableAmountJpy ?? 0,
    RETIREMENT_ALLOWANCE: calculation?.retirementNonTaxableAmountJpy ?? 0,
  };
  const nonTaxableRates = new Map((Object.keys(deemedInheritanceCategories) as DeemedCategory[]).map((category) => {
    const heirBenefit = calculation ? assets.filter((p) => p.category === category).reduce((sum, p) => sum + heirBenefitJpy(p), 0) : 0;
    return [category, heirBenefit > 0 ? Math.min(nonTaxableAmounts[category], heirBenefit) / heirBenefit : 0];
  }));
  const taxableValue = (position: Position) => {
    if (!calculation || !deemedConfig(position)) return position.valueJpy;
    const rate = nonTaxableRates.get(position.category as DeemedCategory) ?? 0;
    return benefitJpy(position) - Math.round(heirBenefitJpy(position) * rate);
  };
  const netEstate = assets.reduce((sum, p) => sum + taxableValue(p), 0) - liabilities.reduce((sum, p) => sum + taxableValue(p), 0);
  const burdenTaxTotal = calculation?.totalTaxBeforeDeductionsJpy ?? snapshot.estimatedInheritanceTax;
  const burdenRate = netEstate > 0 && burdenTaxTotal > 0 ? burdenTaxTotal / netEstate : 0;
  return (position: Position) => {
    if (burdenRate === 0) return null;
    if (position.side === "ASSET") return Math.round(taxableValue(position) * burdenRate);
    return position.includedInNetWorth ? -Math.round(taxableValue(position) * burdenRate) : null;
  };
}
