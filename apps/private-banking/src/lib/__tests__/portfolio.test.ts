import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock は import より上に巻き上げられるため、モック本体も hoisted で用意する。
const prismaMock = vi.hoisted(() => ({
  household: { findFirst: vi.fn(), findUnique: vi.fn() },
  snapshot: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { CATEGORY_LABELS, getPortfolio } = await import("@/lib/portfolio");

/** Decimal は toString() しか使わないので、テストでは同じ振る舞いの値で代用する。 */
const decimal = (value: number) => ({ toString: () => String(value) }) as unknown as Prisma.Decimal;

const household = {
  id: 7,
  clientCode: "PB-000007",
  name: "山田 太郎",
  nameKana: "ヤマダ タロウ",
  assignedStaff: "佐藤",
  currency: "JPY",
  estimatedInheritanceTax: decimal(12000000),
  otherTaxes: decimal(500000),
  successionCosts: decimal(3000000),
  inheritanceTaxUpdatedAt: new Date("2026-04-01T00:00:00.000Z"),
  hasSpouse: true,
  heirRank: 1,
  heirCount: 3,
};

const snapshot = {
  id: 18,
  label: "現在",
  asOfDate: new Date("2025-12-31T00:00:00.000Z"),
  fiscalYear: 2025,
  isCurrent: true,
  estimatedInheritanceTax: decimal(12000000),
  otherTaxes: decimal(500000),
  updatedAt: new Date("2026-04-01T09:00:00.000Z"),
  positions: [
    {
      id: 101,
      side: "ASSET",
      category: "REAL_ESTATE",
      name: "賃貸土地",
      originalAmount: decimal(27000000),
      fxRate: decimal(1),
      valueJpy: decimal(27000000),
      valuationQuantity: null,
      valuationUnitPrice: null,
      adjustmentRate: decimal(0.9),
      landArea: decimal(200),
      roadsideValue: decimal(300000),
      fixedAssetTaxValue: null,
      valuationMultiplier: null,
      ownershipShare: decimal(0.5),
      ownershipNumerator: 1,
      ownershipDenominator: 2,
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
      updatedAt: new Date("2026-01-10T00:00:00.000Z"),
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.snapshot.findMany.mockResolvedValue([snapshot]);
});

describe("getPortfolio", () => {
  it("顧客がいなければテストデータを作らずエラーにする", async () => {
    prismaMock.household.findFirst.mockResolvedValue(null);
    await expect(getPortfolio()).rejects.toThrow("HOUSEHOLD_NOT_FOUND");
    // 復活バグの再発防止。顧客・年度・明細を勝手に作らないこと。
    expect(prismaMock.snapshot.findMany).not.toHaveBeenCalled();
  });

  it("指定した顧客が見つからなければエラーにする", async () => {
    prismaMock.household.findUnique.mockResolvedValue(null);
    await expect(getPortfolio(999)).rejects.toThrow("HOUSEHOLD_NOT_FOUND");
    expect(prismaMock.household.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    expect(prismaMock.household.findFirst).not.toHaveBeenCalled();
  });

  it("顧客IDの指定がなければ先頭の顧客を使う", async () => {
    prismaMock.household.findFirst.mockResolvedValue(household);
    const portfolio = await getPortfolio();
    expect(prismaMock.household.findFirst).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
    expect(portfolio.household.id).toBe(7);
  });

  it("Decimal と日付を JSON で扱える形に変換する", async () => {
    prismaMock.household.findUnique.mockResolvedValue(household);
    const portfolio = await getPortfolio(7);

    expect(portfolio.household).toEqual({
      id: 7,
      clientCode: "PB-000007",
      name: "山田 太郎",
      nameKana: "ヤマダ タロウ",
      assignedStaff: "佐藤",
      currency: "JPY",
    });
    expect(portfolio.planning).toEqual({
      estimatedInheritanceTax: 12000000,
      otherTaxes: 500000,
      successionCosts: 3000000,
      inheritanceTaxUpdatedAt: "2026-04-01T00:00:00.000Z",
      hasSpouse: true,
      heirRank: 1,
      heirCount: 3,
    });

    const [first] = portfolio.snapshots;
    expect(first.asOfDate).toBe("2025-12-31");
    expect(first.estimatedInheritanceTax).toBe(12000000);
    expect(first.positions[0].valueJpy).toBe(27000000);
    expect(first.positions[0].ownershipShare).toBe(0.5);
    // 未入力の Decimal 列は null のまま返す（0 に潰さない）。
    expect(first.positions[0].valuationQuantity).toBeNull();
    expect(first.positions[0].fixedAssetTaxValue).toBeNull();
    expect(first.positions[0].createdAt).toBe("2026-01-10T00:00:00.000Z");
  });

  it("年度は現在→年度降順で取得する", async () => {
    prismaMock.household.findUnique.mockResolvedValue(household);
    await getPortfolio(7);
    expect(prismaMock.snapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { householdId: 7 },
      orderBy: [{ isCurrent: "desc" }, { fiscalYear: "desc" }],
    }));
  });
});

describe("CATEGORY_LABELS", () => {
  it("負債側の科目にも日本語名がある", () => {
    expect(CATEGORY_LABELS.LOAN_HOME).toBe("住宅ローン");
    expect(CATEGORY_LABELS.GUARANTEE).toBe("個人保証");
  });
});
