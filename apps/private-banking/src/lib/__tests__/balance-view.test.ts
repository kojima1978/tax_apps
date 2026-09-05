import { describe, expect, it } from "vitest";
import { buildBalanceView, loanBreakdownTotals, successionAssetTotals } from "@/lib/balance-view";
import { type Position, totals } from "@/lib/portfolio-view";

const asset = (category: string, valueJpy: number, assetDetails: Position["assetDetails"] = null) =>
  ({ side: "ASSET", category, valueJpy, currency: "JPY", fxRate: 1, includedInNetWorth: true, assetDetails } as Position);
const liability = (category: string, valueJpy: number, includedInNetWorth = true) =>
  ({ side: "LIABILITY", category, valueJpy, currency: "JPY", fxRate: 1, includedInNetWorth, assetDetails: null } as Position);

describe("successionAssetTotals", () => {
  it("科目を中分類（金融資産・不動産・事業用資産）へ合算する", () => {
    const result = successionAssetTotals([
      asset("DEPOSIT", 10_000_000),
      asset("SECURITIES", 5_000_000),
      asset("HOME_REAL_ESTATE", 30_000_000),
      asset("IDLE_REAL_ESTATE", 4_000_000),
      asset("PRIVATE_SHARES", 20_000_000),
      asset("LOAN_RECEIVABLE", 1_000_000),
    ]);
    expect(result.financial).toBe(15_000_000);
    expect(result.realEstate).toBe(34_000_000);
    expect(result.business).toBe(21_000_000);
  });

  it("生命保険・退職金は解約返戻金と死亡給付金の両方を持つ", () => {
    const result = successionAssetTotals([
      asset("INSURANCE", 5_000_000, { deathBenefit: 30_000_000 }),
      asset("RETIREMENT_ALLOWANCE", 2_000_000, { retirementAllowance: 10_000_000 }),
    ]);
    expect(result.insurance).toBe(5_000_000);
    expect(result.insuranceDeathBenefit).toBe(30_000_000);
    expect(result.retirementAllowance).toBe(2_000_000);
    expect(result.retirementDeathBenefit).toBe(10_000_000);
    expect(result.deemedBenefitMissingCount).toBe(0);
  });

  it("死亡給付金が未入力のみなし相続財産を数える", () => {
    const result = successionAssetTotals([
      asset("INSURANCE", 5_000_000, { deathBenefit: 30_000_000 }),
      asset("INSURANCE", 1_000_000, null),
      asset("RETIREMENT_ALLOWANCE", 2_000_000, null),
    ]);
    expect(result.deemedBenefitMissingCount).toBe(2);
  });

  it("死亡保険金0円は空欄と区別して入力済みとして扱う", () => {
    const result = successionAssetTotals([
      asset("INSURANCE", 0, { deathBenefit: 0 }),
      asset("INSURANCE", 1_000_000, {}),
    ]);
    expect(result.insuranceDeathBenefit).toBe(0);
    expect(result.insurance).toBe(1_000_000);
    expect(result.deemedBenefitMissingCount).toBe(1);
  });

  it("負債と、分類の無い資産は「その他資産」へ回す", () => {
    const result = successionAssetTotals([
      asset("COLLECTIBLES", 3_000_000),
      liability("LOAN_HOME", 50_000_000),
    ]);
    expect(result.otherAssets).toBe(3_000_000);
    expect(result.financial + result.realEstate + result.business).toBe(0);
  });
});

describe("loanBreakdownTotals", () => {
  it("借入金を種類別に分け、B/S外の個人保証は含めない", () => {
    const result = loanBreakdownTotals([
      liability("LOAN_HOME", 20_000_000),
      liability("LOAN_INVESTMENT_PROPERTY", 30_000_000),
      liability("LOAN_SECURITIES", 4_000_000),
      liability("LOAN_BUSINESS", 6_000_000),
      liability("LOAN_OTHER", 1_000_000),
      liability("GUARANTEE", 90_000_000, false),
      asset("DEPOSIT", 10_000_000),
    ]);
    expect(result).toEqual({ home: 20_000_000, investmentProperty: 30_000_000, securities: 4_000_000, business: 6_000_000, other: 1_000_000 });
  });
});

describe("buildBalanceView", () => {
  const positions = [
    asset("DEPOSIT", 40_000_000),
    asset("HOME_REAL_ESTATE", 60_000_000),
    asset("INSURANCE", 10_000_000, { deathBenefit: 50_000_000 }),
    liability("LOAN_HOME", 30_000_000),
    liability("GUARANTEE", 100_000_000, false),
  ];
  const view = (scenario: "without-tax" | "with-tax", overrides: { estimatedInheritanceTax?: number; otherTaxes?: number; successionCosts?: number } = {}) => buildBalanceView({
    scenario,
    summary: totals(positions),
    successionAssets: successionAssetTotals(positions),
    loanBreakdown: loanBreakdownTotals(positions),
    estimatedInheritanceTax: 12_000_000,
    otherTaxes: 3_000_000,
    successionCosts: 5_000_000,
    ...overrides,
  });

  it("税金なしでは解約返戻金のまま、税金・承継関連費用を引かない", () => {
    const result = view("without-tax");
    expect(result.taxIncluded).toBe(false);
    expect(result.displayedAssets.insurance).toBe(10_000_000);
    expect(result.displayedAssetTotal).toBe(110_000_000);
    expect(result.displayedTaxes).toBe(0);
    expect(result.displayedSuccessionCosts).toBe(0);
    expect(result.displayedNetWorth).toBe(80_000_000);
  });

  it("税金ありでは死亡保険金に置き換え、税金と承継関連費用を差し引く", () => {
    const result = view("with-tax");
    expect(result.displayedAssets.insurance).toBe(50_000_000);
    expect(result.displayedAssetTotal).toBe(150_000_000);
    expect(result.displayedTaxes).toBe(15_000_000);
    expect(result.displayedSuccessionCosts).toBe(5_000_000);
    expect(result.displayedNetWorth).toBe(100_000_000);
  });

  it("負債・純資産側の面積合計が資産合計と一致する", () => {
    for (const scenario of ["without-tax", "with-tax"] as const) {
      const result = view(scenario);
      expect(result.fundingAreaTotal).toBe(result.displayedAssetTotal);
    }
  });

  it("小分類は0円の行を落とし、税金ありでは保険のラベルを死亡保険金に変える", () => {
    expect(view("without-tax").subtotals.financial.map((item) => item.label)).toEqual(["預金", "生命保険"]);
    expect(view("with-tax").subtotals.financial.map((item) => item.label)).toEqual(["預金", "生命保険（死亡保険金）"]);
  });

  it("面積比4%未満の区画だけを小区画の注記に回す", () => {
    const result = view("with-tax");
    // 承継関連費用 500万円 ÷ 1億5,000万円 = 3.3%
    expect(result.smallAreaItems.map((item) => item.label)).toEqual(["承継関連費用"]);
  });

  it("小分類が枠内に収まらない中分類だけ、内訳を枠外注記へ回す", () => {
    // 税金300万円は区画420pxのうち8.4pxしか取れず、小分類2行に必要な 18+22px に届かない。
    const result = view("with-tax", { estimatedInheritanceTax: 2_000_000, otherTaxes: 1_000_000 });
    expect(result.clippedSubtotals.map((account) => account.label)).toEqual(["税金"]);
    // 金融資産（252px）と借入金（84px）は面積が十分なので枠内に描く。
    expect(result.clippedSubtotals.some((account) => account.label === "金融資産" || account.label === "借入金")).toBe(false);
  });
});
