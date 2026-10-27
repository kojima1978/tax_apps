import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inheritanceTaxApiCalculationSchema } from "@/lib/inheritance-tax-calculation";
import { createInheritanceTaxRequest } from "@/lib/inheritance-tax-integration";
import { getPortfolio } from "@/lib/portfolio";
import type { Portfolio } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";
import { writeActivityLog } from "@/lib/activity-log";

const inputSchema = z.object({
  householdId: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "顧客IDが正しくありません。" }, { status: 400 });

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

  const apiUrl = process.env.INHERITANCE_TAX_API_URL
    ?? "http://inheritance-tax-app:3004/inheritance-tax-app/api/calculate";
  const apiKey = process.env.INHERITANCE_TAX_API_KEY;

  let calculationResponse: Response;
  try {
    calculationResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(integration.request),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "相続税の計算サービスへ接続できませんでした。" }, { status: 502 });
  }

  const calculation = inheritanceTaxApiCalculationSchema.safeParse(await calculationResponse.json().catch(() => null));
  if (!calculationResponse.ok || !calculation.success) {
    return NextResponse.json({ error: "相続税を計算できませんでした。" }, { status: 502 });
  }

  const estimatedInheritanceTax = new Prisma.Decimal(calculation.data.totalInheritanceTaxJpy);
  const inheritanceTaxUpdatedAt = new Date(calculation.data.calculatedAt);
  const smallLotApplied = integration.source.smallLotReductionJpy > 0;
  const calculationRecord = {
    ...calculation.data,
    source: integration.source,
    warnings: [
      "B/S登録額を基礎とした概算です。相続税評価額との差異を確認してください。",
      smallLotApplied
        ? "小規模宅地等の特例は選択した宅地ごとに減額割合・限度面積を概算適用しています。複数宅地の限度面積調整・選択替えや要件充足の判定は行っていません。"
        : "小規模宅地等の特例、葬式費用、生前贈与加算、未成年者・障害者控除等はこの概算に含めていません。",
      integration.acquisitionAllocationMode === "ACTUAL"
        ? "資産の取得者と負債の負担者の登録内容を、各人の取得割合と納付税額へ反映しています。死亡保険金・死亡退職金は登録した受取人へ帰属させています。"
        : "取得者・負担者が未確定のため、死亡保険金・死亡退職金を除く財産は法定相続分で按分しています。実際の遺産分割により配偶者の税額軽減および各人の納付税額は変動します。",
      ...(integration.unassignedPositionCount > 0
        ? [`取得者・負担者が未定の明細が ${integration.unassignedPositionCount}件あるため、法定相続分による概算を表示しています。すべて登録すると実際の取得割合へ切り替わります。`]
        : []),
      ...(integration.nonHeirAllocationCount > 0
        ? [`親族関係に存在しない人への取得・負担の割当が ${integration.nonHeirAllocationCount}件あるため、現在は法定相続分による概算を表示しています。`]
        : []),
      ...(integration.negativeAcquisitionCount > 0
        ? [`負債負担額が資産取得額を上回る人が ${integration.negativeAcquisitionCount}名いるため、個人別の債務控除を自動適用せず、法定相続分による概算を表示しています。`]
        : []),
      // 法定相続人以外が受取人の分は、按分に混ぜたうえで相続人だけで税額を割り振っている。
      // 実務では相続人以外の取得者として2割加算まで含めて計算するので、差が出ることを明示する。
      ...(integration.nonHeirRecipientCount > 0
        ? [`死亡保険金・死亡退職金の受取人 ${integration.nonHeirRecipientCount}件は法定相続人ではないため、受取人へ帰属させず課税価格に加算したうえで相続人の按分に含めています（相続人以外の取得者としての税額計算は行っていません）。`]
        : []),
      // 受取人名が親族関係と一致しないと非課税枠が黙って0になるため、気づけるように明示する。
      ...(integration.unregisteredRecipientCount > 0
        ? [`このうち ${integration.unregisteredRecipientCount}件は受取人が親族関係タブに登録されていません。受取人を登録者から選び直してください。`]
        : []),
    ],
  };
  await prisma.$transaction(async (tx) => {
    await tx.snapshot.update({
      where: { id: integration.snapshotId },
      data: {
        estimatedInheritanceTax,
        inheritanceTaxCalculation: calculationRecord as Prisma.InputJsonValue,
        inheritanceTaxUpdatedAt,
      },
    });
    await writeActivityLog(tx, { householdId: portfolio.household.id, householdName: portfolio.household.name, clientCode: portfolio.household.clientCode, action: "CALCULATE", entityType: "TAX", entityId: integration.snapshotId, summary: `相続税概算を再計算（${calculation.data.totalInheritanceTaxJpy.toLocaleString("ja-JP")}円）` });
  });

  return NextResponse.json({
    estimatedInheritanceTax: calculation.data.totalInheritanceTaxJpy,
    effectiveTaxRate: calculation.data.effectiveTaxRate,
    inheritanceTaxUpdatedAt: inheritanceTaxUpdatedAt.toISOString(),
    estimatedNetEstate: integration.estimatedNetEstate,
    apiEstateValue: integration.request.estateValueJpy,
    insuranceNonTaxableAmountJpy: calculation.data.insuranceNonTaxableAmountJpy,
    insuranceTaxableDeathBenefitJpy: calculation.data.insuranceTaxableDeathBenefitJpy,
    calculation: calculationRecord,
  });
}
