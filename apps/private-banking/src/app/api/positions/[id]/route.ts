import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatedOriginalAmount, calculatedOwnershipShare, liquidityForCategory, normalizedValuationMethod, positionInputSchema } from "@/lib/position-input";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const position = await prisma.position.findUnique({ where: { id: Number(id) }, include: { snapshot: true } });
  if (!position) {
    return NextResponse.json({ error: "修正対象が見つかりません。" }, { status: 404 });
  }

  const parsed = positionInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });

  const data = parsed.data;
  const originalAmount = calculatedOriginalAmount(data);
  const valueJpy = Math.round(originalAmount * data.fxRate);
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
        ...data,
        ownershipShare: calculatedOwnershipShare(data),
        valuationMethod: normalizedValuationMethod(data),
        liquidity: liquidityForCategory(data.category),
        originalAmount: new Prisma.Decimal(originalAmount),
        fxRate: new Prisma.Decimal(data.fxRate),
        valueJpy: new Prisma.Decimal(valueJpy),
        includedInNetWorth,
        ...(sectionChanged ? { sortOrder: (lastPosition?.sortOrder ?? -1) + 1 } : {}),
      },
    });
    await tx.snapshot.update({ where: { id: position.snapshotId }, data: { updatedAt: new Date() } });
  });
  return NextResponse.json({ id: position.id });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const position = await prisma.position.findUnique({ where: { id: Number(id) }, include: { snapshot: true } });
  if (!position) {
    return NextResponse.json({ error: "削除対象が見つかりません。" }, { status: 404 });
  }
  await prisma.$transaction([
    prisma.position.delete({ where: { id: position.id } }),
    prisma.snapshot.update({ where: { id: position.snapshotId }, data: { updatedAt: new Date() } }),
  ]);
  return new NextResponse(null, { status: 204 });
}
