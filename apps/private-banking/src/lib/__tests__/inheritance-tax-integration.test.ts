import { describe, expect, it } from "vitest";
import type { Portfolio } from "@/lib/portfolio-view";
import { createInheritanceTaxRequest } from "@/lib/inheritance-tax-integration";

const portfolio = {
  household: { id: 7, clientCode: "PB-000007", name: "山田 太郎", nameKana: "", assignedStaff: "", currency: "JPY" },
  planning: {
    estimatedInheritanceTax: 0,
    otherTaxes: 0,
    successionCosts: 0,
    inheritanceTaxUpdatedAt: null,
    hasSpouse: true,
    heirRank: "rank1",
    heirCount: 2,
  },
  snapshots: [{
    id: 18,
    label: "現在",
    asOfDate: "2026-12-31",
    fiscalYear: 2026,
    isCurrent: true,
    estimatedInheritanceTax: 0,
    otherTaxes: 0,
    updatedAt: "2026-07-25T00:00:00.000Z",
    positions: [
      { side: "ASSET", valueJpy: 100_005_000 },
      { side: "LIABILITY", valueJpy: 20_000_000, includedInNetWorth: true },
      { side: "LIABILITY", valueJpy: 50_000_000, includedInNetWorth: false },
    ],
  }],
} as Portfolio;

describe("createInheritanceTaxRequest", () => {
  it("現在年度の純資産を1万円単位へ丸めてAPIリクエストを作る", () => {
    const result = createInheritanceTaxRequest(portfolio);

    expect(result.snapshotId).toBe(18);
    expect(result.estimatedNetEstate).toBe(80_005_000);
    expect(result.request).toEqual({
      estateValueJpy: 80_010_000,
      familyComposition: { hasSpouse: true, selectedRank: "rank1", heirCount: 2 },
      spouseAcquisition: { mode: "legal" },
    });
  });

  it("相続順位がnoneの場合は人数を0人にする", () => {
    const result = createInheritanceTaxRequest({
      ...portfolio,
      planning: { ...portfolio.planning, heirRank: "none", heirCount: 3 },
    });

    expect(result.request.familyComposition.heirCount).toBe(0);
  });

  it("生命保険の解約返戻金・死亡保険金・非課税枠対象をAPIへ渡す", () => {
    const result = createInheritanceTaxRequest({
      ...portfolio,
      snapshots: [{
        ...portfolio.snapshots[0],
        positions: [
          ...portfolio.snapshots[0].positions,
          {
            side: "ASSET",
            category: "INSURANCE",
            valueJpy: 10_000_000,
            fxRate: 1,
            assetDetails: { deathBenefit: 30_000_000, beneficiaryIsLegalHeir: true },
          },
        ],
      }],
    } as Portfolio);

    expect(result.request.lifeInsurance).toEqual({
      surrenderValueJpy: 10_000_000,
      contracts: [{ deathBenefitJpy: 30_000_000, beneficiaryIsLegalHeir: true }],
    });
  });
});
