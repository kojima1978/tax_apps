import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatedOriginalAmount, calculatedOwnershipShare, liquidityForCategory, normalizedValuationMethod, positionInputSchema } from "@/lib/position-input";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = positionInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });

  // 顧客をまたいで現在年度を拾わないよう、対象年度は必ず呼び出し側から受け取る。
  const requestedSnapshotId = Number(body.snapshotId);
  if (!Number.isInteger(requestedSnapshotId) || requestedSnapshotId <= 0) {
    return NextResponse.json({ error: "対象年度を指定してください。" }, { status: 400 });
  }
  const snapshot = await prisma.snapshot.findUnique({ where: { id: requestedSnapshotId } });
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
