import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeActivityLog } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

const fields = z.object({
  householdId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "シナリオ名を入力してください。").max(100),
  assetChangePercent: z.coerce.number().finite().min(-100).max(1000),
  liabilityChangePercent: z.coerce.number().finite().min(-100).max(1000),
  inheritanceTaxJpy: z.coerce.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  successionCostsJpy: z.coerce.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  note: z.string().trim().max(500).default(""),
});
const updateFields = fields.extend({ id: z.coerce.number().int().positive() });

const serialized = (scenario: { id: number; householdId: number; name: string; assetChangePercent: Prisma.Decimal; liabilityChangePercent: Prisma.Decimal; inheritanceTaxJpy: Prisma.Decimal; successionCostsJpy: Prisma.Decimal; note: string; createdAt: Date; updatedAt: Date }) => ({
  ...scenario,
  assetChangePercent: Number(scenario.assetChangePercent), liabilityChangePercent: Number(scenario.liabilityChangePercent),
  inheritanceTaxJpy: Number(scenario.inheritanceTaxJpy), successionCostsJpy: Number(scenario.successionCostsJpy),
  createdAt: scenario.createdAt.toISOString(), updatedAt: scenario.updatedAt.toISOString(),
});

export async function GET(request: Request) {
  const householdId = Number(new URL(request.url).searchParams.get("householdId"));
  if (!Number.isInteger(householdId) || householdId <= 0) return NextResponse.json({ error: "顧客IDが正しくありません。" }, { status: 400 });
  const scenarios = await prisma.planningScenario.findMany({ where: { householdId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
  return NextResponse.json(scenarios.map(serialized));
}

export async function POST(request: Request) {
  const parsed = fields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  const household = await prisma.household.findUnique({ where: { id: parsed.data.householdId }, select: { id: true, name: true, clientCode: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
  const scenario = await prisma.$transaction(async (tx) => {
    const created = await tx.planningScenario.create({ data: parsed.data });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "CREATE", entityType: "SCENARIO", entityId: created.id, summary: `シナリオ「${created.name}」を保存` });
    return created;
  });
  return NextResponse.json(serialized(scenario), { status: 201 });
}

export async function PUT(request: Request) {
  const parsed = updateFields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  const { id, ...data } = parsed.data;
  const household = await prisma.household.findUnique({ where: { id: data.householdId }, select: { id: true, name: true, clientCode: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
  const scenario = await prisma.$transaction(async (tx) => {
    const updated = await tx.planningScenario.update({ where: { id, householdId: data.householdId }, data });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "UPDATE", entityType: "SCENARIO", entityId: updated.id, summary: `シナリオ「${updated.name}」を更新` });
    return updated;
  });
  return NextResponse.json(serialized(scenario));
}

export async function DELETE(request: Request) {
  const parsed = z.object({ id: z.coerce.number().int().positive(), householdId: z.coerce.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "削除対象が正しくありません。" }, { status: 400 });
  const [household, scenario] = await Promise.all([
    prisma.household.findUnique({ where: { id: parsed.data.householdId }, select: { id: true, name: true, clientCode: true } }),
    prisma.planningScenario.findUnique({ where: { id: parsed.data.id } }),
  ]);
  if (!household || !scenario || scenario.householdId !== household.id) return NextResponse.json({ error: "シナリオが見つかりません。" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.planningScenario.delete({ where: { id: scenario.id } });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "DELETE", entityType: "SCENARIO", entityId: scenario.id, summary: `シナリオ「${scenario.name}」を削除` });
  });
  return NextResponse.json({ ok: true });
}
