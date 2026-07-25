import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createInheritanceTaxRequest } from "@/lib/inheritance-tax-integration";
import { getPortfolio } from "@/lib/portfolio";
import type { Portfolio } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  householdId: z.coerce.number().int().positive(),
});

const calculationSchema = z.object({
  schemaVersion: z.string(),
  unit: z.literal("JPY"),
  totalInheritanceTaxJpy: z.number().finite().int().min(0),
  effectiveTaxRate: z.number().finite().min(0),
  calculatedAt: z.string().datetime(),
  insuranceNonTaxableAmountJpy: z.number().finite().int().min(0),
  insuranceTaxableDeathBenefitJpy: z.number().finite().int().min(0),
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
    return NextResponse.json({ error: "相続税計算APIへ接続できませんでした。" }, { status: 502 });
  }

  const calculation = calculationSchema.safeParse(await calculationResponse.json().catch(() => null));
  if (!calculationResponse.ok || !calculation.success) {
    return NextResponse.json({ error: "相続税計算APIで計算できませんでした。" }, { status: 502 });
  }

  const estimatedInheritanceTax = new Prisma.Decimal(calculation.data.totalInheritanceTaxJpy);
  const inheritanceTaxUpdatedAt = new Date(calculation.data.calculatedAt);
  await prisma.$transaction([
    prisma.household.update({
      where: { id: portfolio.household.id },
      data: { estimatedInheritanceTax, inheritanceTaxUpdatedAt },
    }),
    prisma.snapshot.update({
      where: { id: integration.snapshotId },
      data: { estimatedInheritanceTax },
    }),
  ]);

  return NextResponse.json({
    estimatedInheritanceTax: calculation.data.totalInheritanceTaxJpy,
    effectiveTaxRate: calculation.data.effectiveTaxRate,
    inheritanceTaxUpdatedAt: inheritanceTaxUpdatedAt.toISOString(),
    estimatedNetEstate: integration.estimatedNetEstate,
    apiEstateValue: integration.request.estateValueJpy,
    insuranceNonTaxableAmountJpy: calculation.data.insuranceNonTaxableAmountJpy,
    insuranceTaxableDeathBenefitJpy: calculation.data.insuranceTaxableDeathBenefitJpy,
  });
}
