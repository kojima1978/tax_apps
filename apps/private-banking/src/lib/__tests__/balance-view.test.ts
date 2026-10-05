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

  it("事業用不動産は不動産の合計に入り、B/Sの小分類にも出る", () => {
    const positions = [asset("REAL_ESTATE", 30_000_000), asset("BUSINESS_REAL_ESTATE", 20_000_000)];
    const successionAssets = successionAssetTotals(positions);
    expect(successionAssets.businessRealEstate).toBe(20_000_000);
    expect(successionAssets.realEstate).toBe(50_000_000);

    const result = buildBalanceView({
      scenario: "without-tax", summary: totals(positions), successionAssets,
      loanBreakdown: loanBreakdownTotals(positions), estimatedInheritanceTax: 0, otherTaxes: 0, successionCosts: 0,
    });
    const realEstate = result.assetAccounts.find((account) => account.key === "realEstate")!;
    expect(realEstate.value).toBe(50_000_000);
    expect(realEstate.items?.map((item) => item.label)).toEqual(["収益不動産", "事業用不動産"]);
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

  it("生命保険契約に関する権利は金融資産に入り、みなし相続財産としては数えない", () => {
    const result = successionAssetTotals([
      asset("DEPOSIT", 10_000_000),
      asset("INSURANCE_RIGHTS", 3_000_000, { insuredPerson: "山田 花子" }),
    ]);
    expect(result.insuranceRights).toBe(3_000_000);
    expect(result.insurance).toBe(0);
    expect(result.financial).toBe(13_000_000);
    // 保険事故が起きていないので、死亡給付金の未入力としても数えない。
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
    expect(result).toMatchObject({ home: 20_000_000, investmentProperty: 30_000_000, securities: 4_000_000, business: 6_000_000, other: 1_000_000, borrowings: 61_000_000, otherLiabilities: 0 });
  });

  it("リース債務・未払金・預り敷金は借入金に含めず、その他負債へ分ける", () => {
    const result = loanBreakdownTotals([
      liability("LOAN_OTHER", 1_000_000),
      liability("LEASE_OBLIGATION", 2_000_000),
      liability("ACCOUNTS_PAYABLE", 300_000),
      liability("DEPOSITS_RECEIVED", 5_000_000),
    ]);
    expect(result).toMatchObject({ other: 1_000_000, borrowings: 1_000_000, leaseObligations: 2_000_000, accountsPayable: 300_000, depositsReceived: 5_000_000, otherLiabilities: 7_300_000 });
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
    expect(view("without-tax").subtotals.financial.map((item) => item.label)).toEqual(["預金", "生命保険（解約返戻金）"]);
    expect(view("with-tax").subtotals.financial.map((item) => item.label)).toEqual(["預金", "生命保険（死亡保険金）"]);
  });

  it("生命保険契約に関する権利は税金ありでも解約返戻金のまま残す", () => {
    const rightsPositions = [asset("DEPOSIT", 40_000_000), asset("INSURANCE_RIGHTS", 10_000_000, { insuredPerson: "山田 花子" })];
    const rightsView = (scenario: "without-tax" | "with-tax") => buildBalanceView({
      scenario, summary: totals(rightsPositions), successionAssets: successionAssetTotals(rightsPositions),
      loanBreakdown: loanBreakdownTotals(rightsPositions), estimatedInheritanceTax: 0, otherTaxes: 0, successionCosts: 0,
    });
    for (const scenario of ["without-tax", "with-tax"] as const) {
      const result = rightsView(scenario);
      expect(result.displayedAssets.insuranceRights).toBe(10_000_000);
      expect(result.displayedAssets.financial).toBe(50_000_000);
      expect(result.displayedAssetTotal).toBe(50_000_000);
      // どちらのシナリオでも同じ評価額なので、科目名に括弧書きを付けない。
      expect(result.subtotals.financial.map((item) => item.label)).toEqual(["預金", "生命保険契約に関する権利"]);
    }
  });

  it("面積比4%未満の区画を、表の下の注記に回す", () => {
    const result = view("with-tax");
    // 承継関連費用 500万円 ÷ 1億5,000万円 = 3.3%。番号の印は税金（10%）・借入金（20%）の下に積まれた区画の中央に置く。
    const costs = result.callouts.find((callout) => callout.key === "successionCosts")!;
    expect(costs).toMatchObject({ no: 2, side: "funding", tone: "forecast-account", value: 5_000_000, items: [] });
    expect(costs.anchor).toBeCloseTo((0.1 + 0.2 + 5 / 150 / 2) * 100);
  });

  it("小分類が枠内に収まらない中分類は、内訳ごと注記に回す", () => {
    // 税金1,500万円は区画326pxのうち32.6pxしか取れず、字を詰めても小分類2行に必要な 20+20px に届かない。
    const taxes = view("with-tax").callouts.find((callout) => callout.key === "taxes")!;
    expect(taxes).toMatchObject({ no: 1, side: "funding", value: 15_000_000 });
    expect(taxes.items.map((item) => item.label)).toEqual(["相続税", "その他税金"]);

    // 税金300万円（2%）は面積も小さいので、どちらの理由でも注記に出る。
    const result = view("with-tax", { estimatedInheritanceTax: 2_000_000, otherTaxes: 1_000_000 });
    expect(result.callouts.map((callout) => callout.label)).toEqual(["税金", "承継関連費用"]);
    expect(result.callouts.map((callout) => callout.no)).toEqual([1, 2]);
    expect(result.callouts[0].items.map((item) => item.label)).toEqual(["相続税", "その他税金"]);
    // 金融資産（195.6px に小分類2行の99px）と借入金（65.2px に詰めた1行の30px）は枠内に収まる。
    expect(result.callouts.some((callout) => callout.label === "金融資産" || callout.label === "借入金")).toBe(false);
  });

  it("内訳が収まるかは密度クラスと同じ境目で切り替える", () => {
    // 面積比22%以上は字を詰めないので、小分類2行に 61+38=99px 要る。30.4%（99/326）が境目。
    const spacious = view("with-tax", { estimatedInheritanceTax: 40_000_000, otherTaxes: 8_000_000 });
    expect(spacious.callouts.some((callout) => callout.key === "taxes")).toBe(false);
    const tight = view("with-tax", { estimatedInheritanceTax: 36_000_000, otherTaxes: 8_000_000 });
    expect(tight.callouts.find((callout) => callout.key === "taxes")?.items).toHaveLength(2);
  });

  it("その他負債は借入金と別の区画にし、登録が無ければ区画を出さない", () => {
    expect(view("without-tax").fundingAccounts.map((account) => account.label)).toEqual(["借入金", "純資産"]);
    const withOther = [...positions, liability("DEPOSITS_RECEIVED", 10_000_000)];
    const result = buildBalanceView({
      scenario: "without-tax", summary: totals(withOther), successionAssets: successionAssetTotals(withOther), loanBreakdown: loanBreakdownTotals(withOther),
      estimatedInheritanceTax: 0, otherTaxes: 0, successionCosts: 0,
    });
    expect(result.fundingAccounts.filter((account) => account.items).map(({ label, value, items }) => ({ label, value, items }))).toEqual([
      { label: "借入金", value: 30_000_000, items: [{ label: "住宅ローン", value: 30_000_000 }] },
      { label: "その他負債", value: 10_000_000, items: [{ label: "預り敷金・保証金", value: 10_000_000 }] },
    ]);
    expect(result.displayedNetWorth).toBe(70_000_000);
  });
});

