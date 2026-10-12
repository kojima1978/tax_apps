import { describe, expect, it } from "vitest";
import { positionAllocationAmounts, positionAllocationLabel, positionDetailFields } from "@/lib/position-display";
import { type Position } from "@/lib/portfolio-view";

describe("positionDetailFields", () => {
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
