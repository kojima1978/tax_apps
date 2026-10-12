import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { fxRateFor, missingFxRateMessage, parseFxRates } from "@/lib/fx-rates";
import { prisma } from "@/lib/prisma";
import { calculatedOriginalAmount, calculatedOwnershipShare, liquidityForCategory, normalizedValuationMethod, positionInputErrorMessage, positionInputSchema } from "@/lib/position-input";
import { writeActivityLog } from "@/lib/activity-log";

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
