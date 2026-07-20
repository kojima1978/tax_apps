import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatedOriginalAmount, calculatedOwnershipShare, liquidityForCategory, normalizedValuationMethod, positionInputSchema } from "@/lib/position-input";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = positionInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });

  const requestedSnapshotId = Number(body.snapshotId);
  const snapshot = Number.isInteger(requestedSnapshotId) && requestedSnapshotId > 0
    ? await prisma.snapshot.findUnique({ where: { id: requestedSnapshotId } })
    : await prisma.snapshot.findFirst({ where: { isCurrent: true } });
  if (!snapshot) return NextResponse.json({ error: "対象年度のB/Sがありません。" }, { status: 404 });

  const data = parsed.data;
  const originalAmount = calculatedOriginalAmount(data);
  const valueJpy = Math.round(originalAmount * data.fxRate);
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
        ...data,
        ownershipShare: calculatedOwnershipShare(data),
        valuationMethod: normalizedValuationMethod(data),
        liquidity: liquidityForCategory(data.category),
        snapshotId: snapshot.id,
        originalAmount: new Prisma.Decimal(originalAmount),
        fxRate: new Prisma.Decimal(data.fxRate),
        valueJpy: new Prisma.Decimal(valueJpy),
        includedInNetWorth,
        sortOrder: (lastPosition?.sortOrder ?? -1) + 1,
      },
    });
    await tx.snapshot.update({ where: { id: snapshot.id }, data: { updatedAt: new Date() } });
    return created;
  });
  return NextResponse.json({ id: position.id }, { status: 201 });
}
