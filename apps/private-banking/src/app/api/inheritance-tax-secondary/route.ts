import { NextResponse } from "next/server";
import { z } from "zod";
import { inheritanceTaxApiCalculationSchema } from "@/lib/inheritance-tax-calculation";
import { createInheritanceTaxRequest } from "@/lib/inheritance-tax-integration";
import { getPortfolio } from "@/lib/portfolio";
import type { Portfolio } from "@/lib/portfolio-view";

const JPY_PER_MAN_YEN = 10_000;
// 一次相続で配偶者が取得する割合の試算パターン。
const SPOUSE_SHARE_PERCENTS = [0, 25, 50, 75, 100] as const;

const inputSchema = z.object({
  householdId: z.coerce.number().int().positive(),
  spouseOwnAssetsJpy: z.coerce.number().int().min(0).max(100_000_000_000),
});

const roundManYen = (value: number) => Math.round(Math.max(0, value) / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN;

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "入力値が正しくありません。" }, { status: 400 });

  let portfolio;
  try {
    portfolio = await getPortfolio(input.data.householdId);
  } catch {
    return NextResponse.json({ error: "管理対象がありません。" }, { status: 404 });
  }

  let integration;
  try {
    integration = createInheritanceTaxRequest(portfolio as Portfolio);
  } catch {
    return NextResponse.json({ error: "現在年度のB/Sがありません。" }, { status: 404 });
  }

  const { familyComposition } = integration.request;
  if (!familyComposition.hasSpouse || familyComposition.selectedRank !== "rank1" || familyComposition.heirCount < 1) {
    return NextResponse.json({ error: "二次相続の試算は、配偶者と第1順位（子）がいる場合に利用できます。" }, { status: 422 });
  }

  const apiUrl = process.env.INHERITANCE_TAX_API_URL
    ?? "http://inheritance-tax-app:3004/inheritance-tax-app/api/calculate";
  const apiKey = process.env.INHERITANCE_TAX_API_KEY;

  async function callTaxApi(body: unknown) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const parsed = inheritanceTaxApiCalculationSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) return null;
    return parsed.data;
  }

  try {
    const scenarios = [];
    for (const percent of SPOUSE_SHARE_PERCENTS) {
      // 一次相続：配偶者取得割合を percent% に固定して計算。
      const primary = await callTaxApi({
        ...integration.request,
        spouseAcquisition: { mode: "custom", value: percent, unit: "percent" },
      });
      if (!primary) return NextResponse.json({ error: "相続税計算APIで計算できませんでした。" }, { status: 502 });
      const spouseAcquiredJpy = primary.heirs.find((heir) => heir.type === "spouse")?.acquisitionAmountJpy ?? 0;

      // 二次相続：配偶者の固有財産 ＋ 一次で取得した財産を、子のみで相続すると仮定。
      const secondaryEstateJpy = roundManYen(input.data.spouseOwnAssetsJpy + spouseAcquiredJpy);
      const secondary = await callTaxApi({
        estateValueJpy: secondaryEstateJpy,
        familyComposition: { hasSpouse: false, selectedRank: "rank1", heirCount: familyComposition.heirCount },
        spouseAcquisition: { mode: "legal" },
      });
      if (!secondary) return NextResponse.json({ error: "相続税計算APIで計算できませんでした。" }, { status: 502 });

      scenarios.push({
        spouseSharePercent: percent,
        spouseAcquiredJpy,
        primaryTaxJpy: primary.totalInheritanceTaxJpy,
        secondaryEstateJpy,
        secondaryTaxJpy: secondary.totalInheritanceTaxJpy,
        combinedTaxJpy: primary.totalInheritanceTaxJpy + secondary.totalInheritanceTaxJpy,
      });
    }

    const recommended = scenarios.reduce((best, scenario) => scenario.combinedTaxJpy < best.combinedTaxJpy ? scenario : best, scenarios[0]);
    return NextResponse.json({
      heirCount: familyComposition.heirCount,
      spouseOwnAssetsJpy: input.data.spouseOwnAssetsJpy,
      primaryEstateValueJpy: integration.request.estateValueJpy,
      recommendedPercent: recommended.spouseSharePercent,
      scenarios,
    });
  } catch {
    return NextResponse.json({ error: "相続税計算APIへ接続できませんでした。" }, { status: 502 });
  }
}
