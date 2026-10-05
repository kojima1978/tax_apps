import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuditFieldLabel, type FieldChange } from '@/types/audit-fields';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export type { FieldChange };
export { getAuditFieldLabel as getFieldLabel };
export { diffScalar } from './audit-diff';

export async function writeAuditLog(
  tx: TxClient,
  entity: string,
  entityId: number,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  changes?: FieldChange[],
) {
  await tx.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      changes: changes && changes.length > 0 ? (changes as unknown as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function getAuditLogs(entity: string, entityId: number, limit = 50) {
  return prisma.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { changedAt: 'desc' },
    take: limit,
  });
}
