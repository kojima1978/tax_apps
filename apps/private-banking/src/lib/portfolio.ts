import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const CATEGORY_LABELS: Record<string, string> = {
  DEPOSIT: "預金・現金",
  SECURITIES: "有価証券",
  REAL_ESTATE: "不動産",
  PRIVATE_SHARES: "自社株・非上場株",
  INSURANCE: "生命保険",
  COLLECTIBLES: "実物資産",
  LOAN: "借入金",
  GUARANTEE: "個人保証",
};

const samplePositions = [
  ["ASSET", "DEPOSIT", "普通預金・定期預金", "みらい銀行", "JPY", 68000000, 1, 68000000, "HIGH", true, "残高証明"],
  ["ASSET", "SECURITIES", "国内外上場株式・債券", "青山証券", "JPY", 142000000, 1, 142000000, "HIGH", true, "市場時価"],
  ["ASSET", "REAL_ESTATE", "東京都内 自宅", "", "JPY", 185000000, 1, 185000000, "LOW", true, "不動産鑑定参考"],
  ["ASSET", "PRIVATE_SHARES", "山田産業株式会社", "", "JPY", 248000000, 1, 248000000, "LOW", true, "類似業種比準・純資産"],
  ["ASSET", "INSURANCE", "終身保険 解約返戻金", "みらい生命", "JPY", 32000000, 1, 32000000, "MEDIUM", true, "解約返戻金"],
  ["ASSET", "COLLECTIBLES", "美術品・貴金属", "", "JPY", 18000000, 1, 18000000, "LOW", true, "専門業者査定"],
  ["LIABILITY", "LOAN", "不動産担保ローン", "みらい銀行", "JPY", 92000000, 1, 92000000, "MEDIUM", true, "返済予定表"],
  ["LIABILITY", "GUARANTEE", "事業会社借入 個人保証", "地方銀行", "JPY", 120000000, 1, 120000000, "LOW", false, "保証契約書"],
] as const;

async function ensurePortfolio() {
  const existing = await prisma.household.findFirst();
  if (existing) return existing;

  return prisma.household.create({
    data: {
      snapshots: {
        create: {
          label: "現在",
          asOfDate: new Date(),
          isCurrent: true,
          positions: {
            create: samplePositions.map((p, index) => ({
              side: p[0], category: p[1], name: p[2], institution: p[3], currency: p[4],
              originalAmount: new Prisma.Decimal(p[5]), fxRate: new Prisma.Decimal(p[6]),
              valueJpy: new Prisma.Decimal(p[7]), liquidity: p[8], includedInNetWorth: p[9],
              valuationMethod: p[10], sortOrder: index,
            })),
          },
        },
      },
    },
  });
}

const toNumber = (value: Prisma.Decimal) => Number(value.toString());

export async function getPortfolio() {
  const household = await ensurePortfolio();
  const snapshots = await prisma.snapshot.findMany({
    where: { householdId: household.id },
    include: { positions: { orderBy: [{ side: "asc" }, { sortOrder: "asc" }] } },
    orderBy: [{ isCurrent: "desc" }, { asOfDate: "desc" }],
  });

  return {
    household: { id: household.id, name: household.name, currency: household.currency },
    planning: {
      estimatedInheritanceTax: toNumber(household.estimatedInheritanceTax),
      successionCosts: toNumber(household.successionCosts),
      inheritanceTaxUpdatedAt: household.inheritanceTaxUpdatedAt?.toISOString() ?? null,
      hasSpouse: household.hasSpouse,
      heirRank: household.heirRank,
      heirCount: household.heirCount,
    },
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      label: snapshot.label,
      asOfDate: snapshot.asOfDate.toISOString().slice(0, 10),
      isCurrent: snapshot.isCurrent,
      positions: snapshot.positions.map((position) => ({
        ...position,
        originalAmount: toNumber(position.originalAmount),
        fxRate: toNumber(position.fxRate),
        valueJpy: toNumber(position.valueJpy),
        createdAt: position.createdAt.toISOString(),
        updatedAt: position.updatedAt.toISOString(),
      })),
    })),
  };
}
