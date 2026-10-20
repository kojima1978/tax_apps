import { describe, expect, it } from "vitest";
import { positionAllocationAmounts, positionAllocationLabel, positionDetailFields, positionDetailTableValue } from "@/lib/position-display";
import { type Position } from "@/lib/portfolio-view";

describe("positionDetailFields", () => {
  it("外貨保険の死亡保険金を円貨列では円換算して表示する", () => {
    const p = { category: "INSURANCE", currency: "USD", fxRate: 150, assetDetails: { deathBenefit: 100000 } } as Position;
    expect(positionDetailTableValue(p, "死亡保険金")).toBe("15,000,000");
  });
  it("不動産の持分は分子と分母を3桁区切りで表示する", () => {
    const fields = new Map(positionDetailFields({
      side: "ASSET",
      category: "HOME_REAL_ESTATE",
      valuationFormula: "LAND_ROADSIDE",
      assetDetails: { propertyType: "LAND" },
      ownershipNumerator: 9_006,
      ownershipDenominator: 534_683,
      ownershipShare: 9_006 / 534_683,
    } as Position));

    expect(fields.get("持分")).toBe("9,006/534,683");
  });

  it("科目別表の円貨項目は通貨記号と単位を付けずに表示する", () => {
    const position = {
      category: "INSURANCE",
      currency: "JPY", fxRate: 1,
      assetDetails: { deathBenefit: 50_000_000 },
      fixedAssetTaxValue: 12_345_678,
    } as Position;
    expect(positionDetailTableValue(position, "死亡保険金")).toBe("50,000,000");
    expect(positionDetailTableValue(position, "固定資産税評価額")).toBe("12,345,678");
  });

  it("貸付条件を詳細・印刷表向けの値へ変換する", () => {
    const position = {
      side: "ASSET",
      category: "LOAN_RECEIVABLE",
      institution: "株式会社A",
      assetDetails: { repaymentDueDate: "2030-03-31", interestRate: 1.5, collateral: "対象不動産" },
    } as Position;
    const fields = new Map(positionDetailFields(position));
    expect(fields.get("返済期限")).toBe("2030-03-31");
    expect(fields.get("利率")).toBe("1.5%");
    expect(fields.get("担保")).toBe("対象不動産");
    expect(positionDetailTableValue(position, "利率")).toBe("1.5");
  });
});

describe("positionAllocationAmounts", () => {
  it("端数を調整し、配分額の合計を評価額と一致させる", () => {
    const position = {
      valueJpy: 100,
      allocations: [
        { id: 1, familyMemberId: 10, familyMemberName: "長女", role: "ACQUIRER", numerator: 1, denominator: 3 },
        { id: 2, familyMemberId: 11, familyMemberName: "長男", role: "ACQUIRER", numerator: 2, denominator: 3 },
      ],
    } as Position;
    expect(positionAllocationAmounts(position).map(({ amountJpy }) => amountJpy)).toEqual([33, 67]);
    expect(positionAllocationLabel(position)).toBe("長女 ￥33、長男 ￥67");
  });
});
