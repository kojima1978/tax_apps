import type { Prisma } from "@prisma/client";

type Transaction = Prisma.TransactionClient;

/**
 * 現在担当者の変更と履歴の終了・開始を同じトランザクションで行う。
 * 変更がない保存では履歴を増やさない。
 */
export async function changeHouseholdStaff(
  tx: Transaction,
  household: { id: number; staffId: number | null },
  nextStaffId: number | null,
) {
  // 同時変更でも履歴の終了と開始が交錯しないよう顧客行をロックする。
  await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${household.id} FOR UPDATE`;
  const current = await tx.household.findUniqueOrThrow({ where: { id: household.id }, select: { staffId: true } });
  if (current.staffId === nextStaffId) return null;
  const changedAt = new Date();

  const nextStaff = nextStaffId === null ? null : await tx.staff.findUnique({
    where: { id: nextStaffId },
    select: { id: true, staffCode: true, name: true, isActive: true },
  });
  if (nextStaffId !== null && (!nextStaff || !nextStaff.isActive)) throw new Error("STAFF_NOT_SELECTABLE");

  await tx.staffAssignment.updateMany({
    where: { householdId: household.id, endedAt: null },
    data: { endedAt: changedAt },
  });
  if (nextStaff) {
    await tx.staffAssignment.create({
      data: {
        householdId: household.id,
        staffId: nextStaff.id,
        staffCode: nextStaff.staffCode,
        staffName: nextStaff.name,
        startedAt: changedAt,
      },
    });
  }
  await tx.household.update({ where: { id: household.id }, data: { staffId: nextStaffId } });
  return nextStaff;
}
