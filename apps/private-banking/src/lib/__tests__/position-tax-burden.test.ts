import { describe, expect, it } from "vitest";
import { type Position, type Snapshot } from "@/lib/portfolio-view";
import { buildPositionTaxBurden } from "@/lib/position-tax-burden";

// 名称・受取人はすべて架空のもの

const position = (id: number, category: string, valueJpy: number, extra: Partial<Position> = {}) =>
  ({ id, side: "ASSET", category, name: `明細${id}`, valueJpy, originalAmount: valueJpy, currency: "JPY", fxRate: 1, includedInNetWorth: true, institution: "", valuationMethod: "", assetDetails: null, ...extra } as Position);

const snapshot = (positions: Position[], inheritanceTaxCalculation: Snapshot["inheritanceTaxCalculation"], estimatedInheritanceTax = 10_000_000) =>
  ({ id: 1, fiscalYear: 2027, positions, inheritanceTaxCalculation, estimatedInheritanceTax } as unknown as Snapshot);

const calculation = (extra: Partial<NonNullable<Snapshot["inheritanceTaxCalculation"]>> = {}) =>
  ({ totalTaxBeforeDeductionsJpy: 11_000_000, insuranceNonTaxableAmountJpy: 0, retirementNonTaxableAmountJpy: 0, ...extra } as Snapshot["inheritanceTaxCalculation"]);

describe("明細ごとの相続税負担額", () => {
  const deposit = position(1, "DEPOSIT", 50_000_000);
  const insurance = position(2, "INSURANCE", 5_000_000, { assetDetails: { deathBenefit: 50_000_000, beneficiary: "相続　花子" } });

  it("連携計算値があれば、生命保険は解約返戻金ではなく死亡保険金で按分する", () => {
    // 正味財産 = 預金5,000万円 + 死亡保険金5,000万円。相続税1,100万円を半分ずつ。
    const tax = buildPositionTaxBurden(snapshot([deposit, insurance], calculation()), new Set());
    expect(tax(deposit)).toBe(5_500_000);
    expect(tax(insurance)).toBe(5_500_000);
  });

  it("手動の想定相続税だけのときは解約返戻金で按分する", () => {
    // 正味財産 = 預金5,000万円 + 解約返戻金500万円。想定相続税1,000万円。
    const tax = buildPositionTaxBurden(snapshot([deposit, insurance], null), new Set());
    expect(tax(insurance)).toBe(Math.round(5_000_000 * 10_000_000 / 55_000_000));
    expect(tax(deposit)! + tax(insurance)!).toBe(10_000_000);
  });

  it("相続人が受け取る死亡保険金は非課税枠を差し引いて按分する", () => {
    // 非課税枠1,000万円を差し引いた4,000万円が課税対象。正味財産は9,000万円。
    const tax = buildPositionTaxBurden(snapshot([deposit, insurance], calculation({ insuranceNonTaxableAmountJpy: 10_000_000 })), new Set(["相続　花子"]));
    expect(tax(insurance)).toBe(Math.round(40_000_000 * 11_000_000 / 90_000_000));
    expect(tax(deposit)! + tax(insurance)!).toBe(11_000_000);
  });

  it("負債はマイナス（軽減）、B/S外の保証と相続税が無い年度は null", () => {
    const loan = position(3, "LOAN_HOME", 10_000_000, { side: "LIABILITY" });
    const guarantee = position(4, "GUARANTEE", 20_000_000, { side: "LIABILITY", includedInNetWorth: false });
    const tax = buildPositionTaxBurden(snapshot([deposit, loan, guarantee], null, 8_000_000), new Set());
    expect(tax(deposit)).toBe(10_000_000);
    expect(tax(loan)).toBe(-2_000_000);
    expect(tax(guarantee)).toBeNull();
    expect(buildPositionTaxBurden(snapshot([deposit], null, 0), new Set())(deposit)).toBeNull();
  });
});
