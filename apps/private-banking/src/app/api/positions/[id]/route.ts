import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { fxRateFor, missingFxRateMessage, parseFxRates } from "@/lib/fx-rates";
import { prisma } from "@/lib/prisma";
import { calculatedOriginalAmount, calculatedOwnershipShare, liquidityForCategory, normalizedValuationMethod, positionInputErrorMessage, positionInputSchema } from "@/lib/position-input";
import { writeActivityLog } from "@/lib/activity-log";
import { z } from "zod";
import { propertyPlanLabel, propertyPlanValues } from "@/lib/property-plan";
import { realEstateCategories } from "@/lib/portfolio-view";

const propertyPlanPatchSchema = z.object({ snapshotId: z.number().int().positive(), propertyPlan: z.enum(propertyPlanValues) }).strict();

/** 方針だけの更新。金額・割り振り・他の補足項目は書き換えない。 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const positionId = Number(id);
  const parsed = propertyPlanPatchSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isSafeInteger(positionId) || positionId <= 0 || !parsed.success) {
    return NextResponse.json({ error: "方針の入力内容を確認してください。" }, { status: 400 });
  }
  return prisma.$transaction(async (tx) => {
    const position = await tx.position.findUnique({ where: { id: positionId }, include: { snapshot: { include: { household: true } } } });
    if (!position) return NextResponse.json({ error: "修正対象が見つかりません。" }, { status: 404 });
    if (position.snapshotId !== parsed.data.snapshotId || !realEstateCategories.includes(position.category)) {
      return NextResponse.json({ error: "対象年度の不動産を選択してください。" }, { status: 400 });
    }
    const details = position.assetDetails && typeof position.assetDetails === "object" && !Array.isArray(position.assetDetails) ? position.assetDetails as Prisma.JsonObject : {};
    await tx.position.update({ where: { id: position.id }, data: { assetDetails: { ...details, propertyPlan: parsed.data.propertyPlan } as Prisma.InputJsonObject } });
    await tx.snapshot.update({ where: { id: position.snapshotId }, data: { updatedAt: new Date() } });
    const household = position.snapshot.household;
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "UPDATE", entityType: "POSITION", entityId: position.id, summary: `不動産「${position.name}」の方針を「${propertyPlanLabel(parsed.data.propertyPlan)}」に変更`, details: { snapshotId: position.snapshotId, propertyPlan: parsed.data.propertyPlan } });
    return NextResponse.json({ id: position.id });
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const position = await prisma.position.findUnique({ where: { id: Number(id) }, include: { snapshot: true } });
  if (!position) {
    return NextResponse.json({ error: "修正対象が見つかりません。" }, { status: 404 });
  }
  const household = await prisma.household.findUnique({ where: { id: position.snapshot.householdId }, select: { id: true, name: true, clientCode: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });

  const parsed = positionInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: positionInputErrorMessage(parsed.error) }, { status: 400 });

  const data = parsed.data;
  const { allocations, ...positionData } = data;
  const familyMemberCount = allocations.length === 0 ? 0 : await prisma.familyMember.count({
    where: { householdId: household.id, id: { in: allocations.map((allocation) => allocation.familyMemberId) } },
  });
  if (familyMemberCount !== allocations.length) {
    return NextResponse.json({ error: "取得者・負担者に、この顧客へ登録されていない人が含まれています。" }, { status: 400 });
  }
  // 円換算レートは明細ではなく年度に登録した値を使う。
  const fxRate = fxRateFor(parseFxRates(position.snapshot.fxRates), data.currency);
  if (fxRate === null) return NextResponse.json({ error: missingFxRateMessage(data.currency) }, { status: 400 });

  const originalAmount = calculatedOriginalAmount(data);
  const valueJpy = Math.round(originalAmount * fxRate);
  const includedInNetWorth = data.category !== "GUARANTEE";
  const sectionChanged = position.side !== data.side || position.includedInNetWorth !== includedInNetWorth;
  await prisma.$transaction(async (tx) => {
    const lastPosition = sectionChanged ? await tx.position.findFirst({
      where: data.side === "ASSET"
        ? { snapshotId: position.snapshotId, side: "ASSET" }
        : { snapshotId: position.snapshotId, side: "LIABILITY", includedInNetWorth },
      orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
      select: { sortOrder: true },
    }) : null;
    await tx.position.update({
      where: { id: position.id },
      data: {
        ...positionData,
        ownershipShare: calculatedOwnershipShare(data),
        valuationMethod: normalizedValuationMethod(data),
        liquidity: liquidityForCategory(data.category),
        originalAmount: new Prisma.Decimal(originalAmount),
        fxRate: new Prisma.Decimal(fxRate),
        valueJpy: new Prisma.Decimal(valueJpy),
        includedInNetWorth,
        ...(sectionChanged ? { sortOrder: (lastPosition?.sortOrder ?? -1) + 1 } : {}),
        allocations: {
          deleteMany: {},
          ...(allocations.length > 0 ? { create: allocations.map((allocation) => ({
            ...allocation,
            role: data.side === "ASSET" ? "ACQUIRER" : "DEBT_BEARER",
          })) } : {}),
        },
      },
    });
    await tx.snapshot.update({ where: { id: position.snapshotId }, data: { updatedAt: new Date() } });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "UPDATE", entityType: "POSITION", entityId: position.id, summary: `明細「${data.name}」を更新`, details: { snapshotId: position.snapshotId, category: data.category, valueJpy } });
  });
  return NextResponse.json({ id: position.id });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const position = await prisma.position.findUnique({ where: { id: Number(id) }, include: { snapshot: true } });
  if (!position) {
    return NextResponse.json({ error: "削除対象が見つかりません。" }, { status: 404 });
  }
  const household = await prisma.household.findUnique({ where: { id: position.snapshot.householdId }, select: { id: true, name: true, clientCode: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.position.delete({ where: { id: position.id } });
    await tx.snapshot.update({ where: { id: position.snapshotId }, data: { updatedAt: new Date() } });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "DELETE", entityType: "POSITION", entityId: position.id, summary: `明細「${position.name}」を削除`, details: { snapshotId: position.snapshotId, category: position.category, valueJpy: Number(position.valueJpy) } });
  });
  return new NextResponse(null, { status: 204 });
}
