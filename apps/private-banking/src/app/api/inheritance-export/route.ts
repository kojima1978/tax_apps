import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/portfolio";

export async function GET() {
  const portfolio = await getPortfolio();
  const current = portfolio.snapshots.find((snapshot) => snapshot.isCurrent);
  if (!current) return NextResponse.json({ error: "現在のB/Sがありません。" }, { status: 404 });

  const assets = current.positions.filter((position) => position.side === "ASSET");
  const deductibleLiabilities = current.positions.filter((position) => position.side === "LIABILITY" && position.includedInNetWorth);
  const assetTotal = assets.reduce((sum, position) => sum + position.valueJpy, 0);
  const liabilityTotal = deductibleLiabilities.reduce((sum, position) => sum + position.valueJpy, 0);

  return NextResponse.json({
    schemaVersion: "1.0",
    source: "private-banking-portfolio",
    generatedAt: new Date().toISOString(),
    unit: "JPY",
    householdName: portfolio.household.name,
    asOfDate: current.asOfDate,
    marketValueAssets: assetTotal,
    liabilities: liabilityTotal,
    estimatedNetEstate: assetTotal - liabilityTotal,
    valuationBasis: "market-value",
    warning: "時価B/Sによる概算値です。相続税評価額とは一致しないため、計算前に評価替えを確認してください。",
    familyComposition: {
      hasSpouse: portfolio.planning.hasSpouse,
      selectedRank: portfolio.planning.heirRank,
      heirCount: portfolio.planning.heirCount,
    },
    positions: current.positions.map(({ id, side, category, name, valueJpy, includedInNetWorth, valuationMethod }) => ({
      id, side, category, name, valueJpy, includedInNetWorth, valuationMethod,
    })),
  });
}
