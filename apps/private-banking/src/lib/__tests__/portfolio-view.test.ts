import { describe, expect, it } from "vitest";
import { deemedAllocations, middleClassification, positionCategoryLabel, propertyTypeOf, splitBenefit, trendValues, type Position, type Snapshot } from "@/lib/portfolio-view";

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

describe("propertyTypeOf / positionCategoryLabel", () => {
  const position = (fields: Partial<Position>) => ({ category: "HOME_REAL_ESTATE", valuationFormula: "MANUAL", assetDetails: null, ...fields } as Position);

  it("保存した土地・建物の区分を優先する", () => {
    expect(propertyTypeOf(position({ valuationFormula: "LAND_ROADSIDE", assetDetails: { propertyType: "BUILDING" } }))).toBe("BUILDING");
    expect(positionCategoryLabel(position({ assetDetails: { propertyType: "LAND" } }))).toBe("居宅・土地");
  });

  it("区分を保存していない古い明細は、建物の算式なら建物、それ以外は土地とみなす", () => {
    expect(propertyTypeOf(position({ category: "REAL_ESTATE", valuationFormula: "BUILDING" }))).toBe("BUILDING");
    expect(positionCategoryLabel(position({ category: "REAL_ESTATE", valuationFormula: "BUILDING" }))).toBe("収益不動産・建物");
    expect(propertyTypeOf(position({ valuationFormula: "MANUAL" }))).toBe("LAND");
  });

  it("不動産以外は区分を持たず、科目名だけを出す", () => {
    expect(propertyTypeOf(position({ category: "DEPOSIT" }))).toBeNull();
    expect(positionCategoryLabel(position({ category: "DEPOSIT" }))).toBe("預金・現金");
  });
});

describe("事業用不動産", () => {
  const asset = (category: string, valueJpy: number) => ({ side: "ASSET", category, valueJpy, includedInNetWorth: true } as Position);

  it("中分類は不動産で、推移表でも不動産の内訳として集計する", () => {
    const realEstate = asset("BUSINESS_REAL_ESTATE", 20_000_000);
    expect(middleClassification(realEstate)).toBe("不動産");
    expect(propertyTypeOf({ category: "BUSINESS_REAL_ESTATE", valuationFormula: "LAND_ROADSIDE", assetDetails: null } as Position)).toBe("LAND");

    const values = trendValues({
      estimatedInheritanceTax: 0, otherTaxes: 0,
      positions: [asset("REAL_ESTATE", 30_000_000), realEstate],
    } as unknown as Snapshot);
    expect(values.businessRealEstate).toBe(20_000_000);
    expect(values.realEstate).toBe(50_000_000);
    expect(values.otherAssets).toBe(0);
  });
});

describe("その他負債（リース債務・未払金・預り敷金・保証金）", () => {
  const liability = (category: string, valueJpy: number) => ({ side: "LIABILITY", category, valueJpy, includedInNetWorth: true } as Position);

  it("借入金とは別の中分類「その他負債」に入れる", () => {
    expect(middleClassification(liability("LOAN_HOME", 1))).toBe("借入金");
    for (const category of ["LEASE_OBLIGATION", "ACCOUNTS_PAYABLE", "DEPOSITS_RECEIVED"]) {
      expect(middleClassification(liability(category, 1))).toBe("その他負債");
    }
  });

  it("推移表では借入金と分けて集計し、負債合計には両方を含める", () => {
    const values = trendValues({
      estimatedInheritanceTax: 0, otherTaxes: 0,
      positions: [liability("LOAN_HOME", 30_000_000), liability("LEASE_OBLIGATION", 1_000_000), liability("ACCOUNTS_PAYABLE", 200_000), liability("DEPOSITS_RECEIVED", 3_000_000)],
    } as unknown as Snapshot);
    expect(values.borrowings).toBe(30_000_000);
    expect(values.loanOther).toBe(0);
    expect(values).toMatchObject({ leaseObligations: 1_000_000, accountsPayable: 200_000, depositsReceived: 3_000_000, otherLiabilities: 4_200_000 });
    expect(values.liabilities).toBe(34_200_000);
  });
});
