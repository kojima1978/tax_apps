import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { fxRateFor, missingFxRateMessage, parseFxRates } from "@/lib/fx-rates";
import { prisma } from "@/lib/prisma";
import { calculatedOriginalAmount, calculatedOwnershipShare, liquidityForCategory, normalizedValuationMethod, positionInputErrorMessage, positionInputSchema } from "@/lib/position-input";
import { writeActivityLog } from "@/lib/activity-log";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = positionInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: positionInputErrorMessage(parsed.error) }, { status: 400 });

  // 顧客をまたいで現在年度を拾わないよう、対象年度は必ず呼び出し側から受け取る。
  const requestedSnapshotId = Number(body.snapshotId);
  if (!Number.isInteger(requestedSnapshotId) || requestedSnapshotId <= 0) {
    return NextResponse.json({ error: "対象年度を指定してください。" }, { status: 400 });
  }
  const snapshot = await prisma.snapshot.findUnique({ where: { id: requestedSnapshotId } });
  if (!snapshot) return NextResponse.json({ error: "対象年度のB/Sがありません。" }, { status: 404 });
  const household = await prisma.household.findUnique({ where: { id: snapshot.householdId }, select: { id: true, name: true, clientCode: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });

  const data = parsed.data;
  const { allocations, ...positionData } = data;
  const familyMemberCount = allocations.length === 0 ? 0 : await prisma.familyMember.count({
    where: { householdId: household.id, id: { in: allocations.map((allocation) => allocation.familyMemberId) } },
  });
  if (familyMemberCount !== allocations.length) {
    return NextResponse.json({ error: "取得者・負担者に、この顧客へ登録されていない人が含まれています。" }, { status: 400 });
  }
  // 円換算レートは明細ではなく年度に登録した値を使う。
  const fxRate = fxRateFor(parseFxRates(snapshot.fxRates), data.currency);
  if (fxRate === null) return NextResponse.json({ error: missingFxRateMessage(data.currency) }, { status: 400 });

  const originalAmount = calculatedOriginalAmount(data);
  const valueJpy = Math.round(originalAmount * fxRate);
  const includedInNetWorth = data.category !== "GUARANTEE";
  const position = await prisma.$transaction(async (tx) => {
    const lastPosition = await tx.position.findFirst({
      where: data.side === "ASSET"
        ? { snapshotId: snapshot.id, side: "ASSET" }
        : { snapshotId: snapshot.id, side: "LIABILITY", includedInNetWorth },
      orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
      select: { sortOrder: true },
    });
    const created = await tx.position.create({
      data: {
        ...positionData,
        ownershipShare: calculatedOwnershipShare(data),
        valuationMethod: normalizedValuationMethod(data),
        liquidity: liquidityForCategory(data.category),
        snapshotId: snapshot.id,
        originalAmount: new Prisma.Decimal(originalAmount),
        fxRate: new Prisma.Decimal(fxRate),
        valueJpy: new Prisma.Decimal(valueJpy),
        includedInNetWorth,
        sortOrder: (lastPosition?.sortOrder ?? -1) + 1,
        allocations: allocations.length > 0 ? { create: allocations.map((allocation) => ({
          ...allocation,
          role: data.side === "ASSET" ? "ACQUIRER" : "DEBT_BEARER",
        })) } : undefined,
      },
    });
    await tx.snapshot.update({ where: { id: snapshot.id }, data: { updatedAt: new Date() } });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "CREATE", entityType: "POSITION", entityId: created.id, summary: `明細「${created.name}」を登録`, details: { snapshotId: snapshot.id, category: created.category, valueJpy } });
    return created;
  });
  return NextResponse.json({ id: position.id }, { status: 201 });
}
