import { describe, expect, it } from "vitest";
import type { Portfolio } from "@/lib/portfolio-view";
import { createInheritanceTaxRequest } from "@/lib/inheritance-tax-integration";

const portfolio = {
  household: { id: 7, clientCode: "PB-000007", name: "山田 太郎", nameKana: "", birthDate: null, assignedStaff: "", currency: "JPY" },
  planning: {
    estimatedInheritanceTax: 0,
    otherTaxes: 0,
    successionCosts: 0,
    inheritanceTaxUpdatedAt: null,
    hasSpouse: true,
    heirRank: "rank1",
    heirCount: 2,
  },
  familyMembers: [
    { name: "山田 花子", relationship: "SPOUSE", acquisitionReason: "INHERITANCE" },
    { name: "山田 一郎", relationship: "CHILD", acquisitionReason: "INHERITANCE" },
    { name: "山田 次郎", relationship: "SIBLING", acquisitionReason: "INHERITANCE" },
  ],
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
} as unknown as Portfolio;

describe("createInheritanceTaxRequest", () => {
  it("現在年度の純資産を1万円単位へ丸めてAPIリクエストを作る", () => {
    const result = createInheritanceTaxRequest(portfolio);

    expect(result.snapshotId).toBe(18);
    expect(result.estimatedNetEstate).toBe(80_005_000);
    expect(result.source).toMatchObject({
      snapshotId: 18,
      fiscalYear: 2026,
      asOfDate: "2026-12-31",
      totalAssetsJpy: 100_005_000,
      deductibleLiabilitiesJpy: 20_000_000,
      estimatedNetEstateJpy: 80_005_000,
    });
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
            assetDetails: { deathBenefit: 30_000_000, beneficiary: "山田 花子" },
          },
        ],
      }],
    } as Portfolio);

    expect(result.request.lifeInsurance).toEqual({
      surrenderValueJpy: 10_000_000,
      contracts: [{ deathBenefitJpy: 30_000_000, beneficiaryIsLegalHeir: true }],
    });
  });

  it("退職金の解約手当金・死亡退職金・非課税枠対象をAPIへ渡す", () => {
    const result = createInheritanceTaxRequest({
      ...portfolio,
      snapshots: [{
        ...portfolio.snapshots[0],
        positions: [
          ...portfolio.snapshots[0].positions,
          {
            side: "ASSET",
            category: "RETIREMENT_ALLOWANCE",
            valueJpy: 5_000_000,
            fxRate: 1,
            assetDetails: { retirementAllowance: 20_000_000, retirementRecipient: "山田 花子" },
          },
        ],
      }],
    } as Portfolio);

    expect(result.request.retirementAllowance).toEqual({
      surrenderValueJpy: 5_000_000,
      contracts: [{ deathBenefitJpy: 20_000_000, recipientIsLegalHeir: true }],
    });
    // 退職金を持たない構成ではキー自体を送らない（生命保険と同じ扱い）。
    expect(createInheritanceTaxRequest(portfolio).request.retirementAllowance).toBeUndefined();
  });

  it("受取人が法定相続人でなければ非課税枠の対象にしない", () => {
    const result = createInheritanceTaxRequest({
      ...portfolio,
      snapshots: [{
        ...portfolio.snapshots[0],
        positions: [
          ...portfolio.snapshots[0].positions,
          // 第1順位（子）がいるので、兄弟姉妹は法定相続人にならない。
          { side: "ASSET", category: "INSURANCE", valueJpy: 1_000_000, fxRate: 1, assetDetails: { deathBenefit: 10_000_000, beneficiary: "山田 次郎" } },
          // 親族関係タブに登録の無い受取人も対象外。
          { side: "ASSET", category: "RETIREMENT_ALLOWANCE", valueJpy: 1_000_000, fxRate: 1, assetDetails: { retirementAllowance: 10_000_000, retirementRecipient: "友人 太郎" } },
        ],
      }],
    } as Portfolio);

    expect(result.request.lifeInsurance?.contracts).toEqual([{ deathBenefitJpy: 10_000_000, beneficiaryIsLegalHeir: false }]);
    expect(result.request.retirementAllowance?.contracts).toEqual([{ deathBenefitJpy: 10_000_000, recipientIsLegalHeir: false }]);
    // 親族関係に登録の無い受取人だけを警告用に数える（登録済みの兄弟姉妹は数えない）。
    expect(result.unregisteredRecipientCount).toBe(1);
  });

  it("小規模宅地等の特例を選択した宅地は減額して遺産額へ反映する", () => {
    const result = createInheritanceTaxRequest({
      ...portfolio,
      snapshots: [{
        ...portfolio.snapshots[0],
        positions: [
          // 特定居住用（80%・限度330㎡）: 面積165㎡は限度内なので全額の80%減額 → 8,000万円
          { side: "ASSET", category: "HOME_REAL_ESTATE", valueJpy: 100_000_000, landArea: 165, assetDetails: { smallLotType: "RESIDENTIAL" } },
          { side: "LIABILITY", valueJpy: 20_000_000, includedInNetWorth: true },
        ],
      }],
    } as unknown as Portfolio);

    expect(result.source.smallLotReductionJpy).toBe(80_000_000);
    // 正味財産 8,000万 − 減額 8,000万 = 0
    expect(result.request.estateValueJpy).toBe(0);
  });

  it("限度面積を超える宅地は面積按分で減額する", () => {
    const result = createInheritanceTaxRequest({
      ...portfolio,
      snapshots: [{
        ...portfolio.snapshots[0],
        positions: [
          // 貸付事業用（50%・限度200㎡）: 面積400㎡は限度200㎡分のみ → 50% × (200/400) = 25%減額 → 2,500万円
          { side: "ASSET", category: "IDLE_REAL_ESTATE", valueJpy: 100_000_000, landArea: 400, assetDetails: { smallLotType: "RENTAL" } },
        ],
      }],
    } as unknown as Portfolio);

    expect(result.source.smallLotReductionJpy).toBe(25_000_000);
  });
});
