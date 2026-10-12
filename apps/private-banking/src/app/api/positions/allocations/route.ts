import { NextResponse } from "next/server";
import { z } from "zod";
import { writeActivityLog } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  snapshotId: z.coerce.number().int().positive(),
  positions: z.array(z.object({
    positionId: z.coerce.number().int().positive(),
    amounts: z.array(z.object({
      familyMemberId: z.coerce.number().int().positive(),
      amountJpy: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })).max(100),
  })).min(1).max(500),
});

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "割り振りの入力内容を確認してください。" }, { status: 400 });
  const { snapshotId, positions: requested } = parsed.data;
  if (new Set(requested.map((position) => position.positionId)).size !== requested.length) {
    return NextResponse.json({ error: "同じ明細が重複しています。" }, { status: 400 });
  }
  if (requested.some((position) => new Set(position.amounts.map((amount) => amount.familyMemberId)).size !== position.amounts.length)) {
    return NextResponse.json({ error: "同じ取得者・負担者が重複しています。" }, { status: 400 });
  }

  const snapshot = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
    include: { household: { select: { id: true, name: true, clientCode: true } } },
  });
  if (!snapshot) return NextResponse.json({ error: "対象年度のB/Sがありません。" }, { status: 404 });
  const storedPositions = await prisma.position.findMany({
    where: { snapshotId, id: { in: requested.map((position) => position.positionId) } },
    select: { id: true, side: true, category: true, valueJpy: true },
  });
  if (storedPositions.length !== requested.length) {
    return NextResponse.json({ error: "対象年度の明細構成が更新されています。画面を再読み込みしてください。" }, { status: 409 });
  }
  const storedById = new Map(storedPositions.map((position) => [position.id, position]));
  const memberIds = [...new Set(requested.flatMap((position) => position.amounts.map((amount) => amount.familyMemberId)))];
  const familyMemberCount = memberIds.length === 0 ? 0 : await prisma.familyMember.count({ where: { householdId: snapshot.householdId, id: { in: memberIds } } });
  if (familyMemberCount !== memberIds.length) {
    return NextResponse.json({ error: "この顧客へ登録されていない取得者・負担者が含まれています。" }, { status: 400 });
  }

  for (const requestedPosition of requested) {
    const position = storedById.get(requestedPosition.positionId)!;
    if (["INSURANCE", "RETIREMENT_ALLOWANCE"].includes(position.category)) {
      return NextResponse.json({ error: "生命保険・退職金の取得者は受取人情報で変更してください。" }, { status: 400 });
    }
    const total = requestedPosition.amounts.reduce((sum, amount) => sum + amount.amountJpy, 0);
    const valueJpy = Number(position.valueJpy);
    if (total !== 0 && total !== valueJpy) {
      return NextResponse.json({ error: "割当合計が評価額と一致していない明細があります。" }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const requestedPosition of requested) {
      const position = storedById.get(requestedPosition.positionId)!;
      const valueJpy = Number(position.valueJpy);
      const positiveAmounts = requestedPosition.amounts.filter((amount) => amount.amountJpy > 0);
      await tx.positionAllocation.deleteMany({ where: { positionId: position.id } });
      if (positiveAmounts.length > 0) {
        await tx.positionAllocation.createMany({ data: positiveAmounts.map((amount) => {
          const divisor = gcd(amount.amountJpy, valueJpy);
          return {
            positionId: position.id,
            familyMemberId: amount.familyMemberId,
            role: position.side === "ASSET" ? "ACQUIRER" : "DEBT_BEARER",
            numerator: amount.amountJpy / divisor,
            denominator: valueJpy / divisor,
          };
        }) });
      }
    }
    await tx.snapshot.update({ where: { id: snapshotId }, data: { updatedAt: new Date() } });
    await writeActivityLog(tx, {
      householdId: snapshot.household.id,
      householdName: snapshot.household.name,
      clientCode: snapshot.household.clientCode,
      action: "UPDATE",
      entityType: "POSITION",
      entityId: snapshotId,
      summary: `財産の割り振りを${requested.length}件更新`,
      details: { snapshotId, positionIds: requested.map((position) => position.positionId) },
    });
  });
  return NextResponse.json({ ok: true, updatedCount: requested.length });
}
