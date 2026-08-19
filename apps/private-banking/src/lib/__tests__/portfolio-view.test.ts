import { describe, expect, it } from "vitest";
import { deemedAllocations, splitBenefit, type Position } from "@/lib/portfolio-view";

const insurance = (assetDetails: Position["assetDetails"]) => ({ category: "INSURANCE", assetDetails } as Position);

describe("deemedAllocations", () => {
  it("受取人の配列があればそのまま使う", () => {
    const allocations = [
      { recipient: "山田 花子", numerator: 1, denominator: 2 },
      { recipient: "山田 一郎", numerator: 1, denominator: 2 },
    ];
    expect(deemedAllocations(insurance({ benefitAllocations: allocations }))).toEqual(allocations);
  });

  it("配列を持たない明細は従来の受取人へ 1/1 とみなす", () => {
    expect(deemedAllocations(insurance({ beneficiary: "山田 花子" }))).toEqual([
      { recipient: "山田 花子", numerator: 1, denominator: 1 },
    ]);
  });

  it("みなし相続財産でない科目は受取人を持たない", () => {
    expect(deemedAllocations({ category: "DEPOSIT", assetDetails: null } as Position)).toEqual([]);
  });
});

describe("splitBenefit", () => {
  const allocations = (fractions: Array<[number, number]>) =>
    fractions.map(([numerator, denominator], index) => ({ recipient: `受取人${index + 1}`, numerator, denominator }));

  it("分数どおりに割り振る", () => {
    expect(splitBenefit(30_000_000, allocations([[1, 2], [1, 4], [1, 4]]), 10_000)).toEqual([15_000_000, 7_500_000, 7_500_000]);
  });

  it("割り切れない端数は取り分の大きい行から配り、合計を総額に一致させる", () => {
    const amounts = splitBenefit(10_000_000, allocations([[1, 3], [1, 3], [1, 3]]), 10_000);
    expect(amounts).toEqual([3_340_000, 3_330_000, 3_330_000]);
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(10_000_000);
  });

  it("合計が1でない分数でも、比率で割り振って総額を保つ", () => {
    const amounts = splitBenefit(9_000_000, allocations([[1, 2], [1, 4]]), 10_000);
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(9_000_000);
  });

  it("受取人がいなければ空、取り分が0なら0を返す", () => {
    expect(splitBenefit(1_000_000, [])).toEqual([]);
    expect(splitBenefit(1_000_000, allocations([[0, 1]]))).toEqual([0]);
  });
});
