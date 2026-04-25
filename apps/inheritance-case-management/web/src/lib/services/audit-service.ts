import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export interface FieldChange {
  field: string;
  old: unknown;
  new: unknown;
}

const FIELD_LABELS: Record<string, string> = {
  deceasedName: '被相続人氏名',
  dateOfDeath: '死亡日',
  status: '進み具合',
  handlingStatus: '対応状況',
  acceptanceStatus: '受託判定',
  taxAmount: '申告納税額',
  feeAmount: '報酬額',
  estimateAmount: '見積額',
  propertyValue: '遺産総額',
  referralFeeRate: '紹介料率',
  referralFeeAmount: '紹介料額',
  estimateReferralFeeAmount: '見積紹介料額',
  landRosenkaCount: '土地数（路線価）',
  landBairitsuCount: '土地数（倍率）',
  unlistedStockCount: '非上場株式数',
  heirCount: '相続人数',
  discountAmount: '値引額',
  summary: '特記事項',
  memo: 'メモ',
  caseAddedDate: '受託日',
  caseCompletedDate: '申告完了日',
  assigneeId: '担当者',
  internalReferrerId: '社内紹介者',
  referrerId: '紹介者',
  fiscalYear: '年度',
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

const SKIP_FIELDS = new Set(['updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'feeCalcSnapshot']);

function normalize(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === undefined) return null;
  return v;
}

export function diffScalar(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(newObj)) {
    if (SKIP_FIELDS.has(key)) continue;
    const o = normalize(oldObj[key]);
    const n = normalize(newObj[key]);
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      changes.push({ field: key, old: o, new: n });
    }
  }
  return changes;
}

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
