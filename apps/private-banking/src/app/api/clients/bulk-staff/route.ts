import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeActivityLog } from "@/lib/activity-log";

const schema = z.object({
  householdIds: z.array(z.coerce.number().int().positive()).min(1).max(500),
  staffId: z.coerce.number().int().positive(),
});

/** データ品質画面から、担当者未設定の顧客だけをまとめて割り当てる。 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "担当者と対象顧客を選択してください。" }, { status: 400 });
  const householdIds = [...new Set(parsed.data.householdIds)];
  const result = await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findUnique({ where: { id: parsed.data.staffId }, select: { id: true, name: true, isActive: true } });
    if (!staff || !staff.isActive) return { status: 400, error: "有効な担当者を選び直してください。" } as const;
    const households = await tx.household.findMany({
      where: { id: { in: householdIds }, staffId: null },
      select: { id: true, name: true, clientCode: true },
    });
    if (households.length === 0) return { status: 409, error: "担当者未設定の顧客が選択されていません。" } as const;
    await tx.household.updateMany({ where: { id: { in: households.map((row) => row.id) }, staffId: null }, data: { staffId: staff.id } });
    await Promise.all(households.map((household) => writeActivityLog(tx, {
      householdId: household.id,
      householdName: household.name,
      clientCode: household.clientCode,
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: household.id,
      summary: `担当者を${staff.name}に設定`,
    })));
    return { status: 200, count: households.length, staffName: staff.name } as const;
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ count: result.count, staffName: result.staffName });
}
