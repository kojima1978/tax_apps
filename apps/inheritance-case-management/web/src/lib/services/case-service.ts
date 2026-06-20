import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeNameKanaForStorage, normalizePersonSearchText } from '@/lib/person-search';
import {
  CASE_INCLUDE,
  serializeCase,
  toDate,
  toExpenseCreateData,
  toHeirCreateData,
  toProgressCreateData,
  toRelatedPartyCreateData,
  toSpecialAdditionCreateData,
} from '@/lib/prisma-includes';
import { CASE_STATUS_OPTIONS, MILESTONE_DATES, isMilestoneTriggered } from '@/types/constants';
import { diffScalar, writeAuditLog } from './audit-service';
import { todayDate } from './case-date-utils';
import { resolveHeirs, resolveRelatedParties } from './case-person-resolvers';

export { buildCaseWhereClause } from './case-query';

type CreateCaseData = {
  deceasedName: string;
  deceasedNameKana?: string;
  dateOfDeath: string;
  fiscalYear: number;
  status?: string;
  isUndivided?: boolean;
  taxAmount?: number;
  feeAmount?: number;
  estimateAmount?: number;
  propertyValue?: number;
  referralFeeRate?: number | null;
  referralFeeAmount?: number | null;
  estimateReferralFeeAmount?: number | null;
  isReferralFeeManual?: boolean;
  isEstimateReferralFeeManual?: boolean;
  landRosenkaCount?: number;
  landBairitsuCount?: number;
  unlistedStockCount?: number;
  feeCalculationHeirCount?: number;
  discountAmount?: number;
  feeCalcSnapshot?: Prisma.InputJsonValue | null;
  summary?: string | null;
  memo?: string | null;
  caseAddedDate?: string | null;
  caseCompletedDate?: string | null;
  billedDate?: string | null;
  paidDate?: string | null;
  assigneeId?: number | null;
  internalReferrerId?: number | null;
  referrerId?: number | null;
  heirs?: unknown[];
  relatedParties?: unknown[];
  progress?: { id: string; name: string; date: string | null; memo?: string; isDynamic?: boolean }[];
  expenses?: { date: string; description: string; amount: number; memo?: string | null }[];
  specialAdditions?: { description: string; amount: number }[];
};

const CASE_SCALAR_FIELDS = [
  'deceasedName',
  'deceasedNameKana',
  'dateOfDeath',
  'fiscalYear',
  'status',
  'isUndivided',
  'taxAmount',
  'feeAmount',
  'estimateAmount',
  'propertyValue',
  'referralFeeRate',
  'referralFeeAmount',
  'estimateReferralFeeAmount',
  'isReferralFeeManual',
  'isEstimateReferralFeeManual',
  'summary',
  'memo',
  'landRosenkaCount',
  'landBairitsuCount',
  'unlistedStockCount',
  'feeCalculationHeirCount',
  'discountAmount',
  'feeCalcSnapshot',
  'caseAddedDate',
  'caseCompletedDate',
  'billedDate',
  'paidDate',
] as const;

const CASE_DATE_FIELDS = new Set<string>(['dateOfDeath', 'caseAddedDate', 'caseCompletedDate', 'billedDate', 'paidDate']);

function applyScalarUpdates(updateData: Record<string, unknown>, data: Record<string, unknown>) {
  for (const field of CASE_SCALAR_FIELDS) {
    if (!(field in data)) continue;
    if (CASE_DATE_FIELDS.has(field)) {
      const value = data[field];
      updateData[field] = value ? toDate(value as string) : null;
    } else {
      updateData[field] = data[field];
    }
  }
}

function normalizeDeceasedNameKana(updateData: Record<string, unknown>, value: unknown) {
  const normalized = normalizeNameKanaForStorage((value as string) ?? '');
  updateData.deceasedNameKana = normalized;
  updateData.deceasedNameKanaNormalized = normalizePersonSearchText(normalized);
}

function calculateReferralFeeAmount(baseAmount: number | null | undefined, rate: number | null | undefined): number {
  return Math.floor((baseAmount ?? 0) * ((rate ?? 0) / 100));
}

function resolveReferralFeeState(
  data: CreateCaseData | Record<string, unknown>,
  before?: Record<string, unknown>,
) {
  const rate = (
    'referralFeeRate' in data ? data.referralFeeRate : before?.referralFeeRate ?? null
  ) as number | null;
  const feeAmount = (data.feeAmount ?? before?.feeAmount ?? 0) as number;
  const estimateAmount = (data.estimateAmount ?? before?.estimateAmount ?? 0) as number;
  const calculatedFee = calculateReferralFeeAmount(feeAmount, rate);
  const calculatedEstimate = calculateReferralFeeAmount(estimateAmount, rate);
  const suppliedFee = (data.referralFeeAmount ?? before?.referralFeeAmount ?? 0) as number;
  const suppliedEstimate = (data.estimateReferralFeeAmount ?? before?.estimateReferralFeeAmount ?? 0) as number;
  const feeAmountWasSupplied = 'referralFeeAmount' in data;
  const estimateAmountWasSupplied = 'estimateReferralFeeAmount' in data;
  const isReferralFeeManual = data.isReferralFeeManual !== undefined
    ? Boolean(data.isReferralFeeManual)
    : before?.isReferralFeeManual !== undefined
      ? Boolean(before.isReferralFeeManual)
      : feeAmountWasSupplied && suppliedFee !== calculatedFee;
  const isEstimateReferralFeeManual = data.isEstimateReferralFeeManual !== undefined
    ? Boolean(data.isEstimateReferralFeeManual)
    : before?.isEstimateReferralFeeManual !== undefined
      ? Boolean(before.isEstimateReferralFeeManual)
      : estimateAmountWasSupplied && suppliedEstimate !== calculatedEstimate;

  return {
    referralFeeAmount: isReferralFeeManual ? suppliedFee : calculatedFee,
    estimateReferralFeeAmount: isEstimateReferralFeeManual ? suppliedEstimate : calculatedEstimate,
    isReferralFeeManual,
    isEstimateReferralFeeManual,
  };
}

function normalizeMilestoneDateUpdates(
  updateData: Record<string, unknown>,
  status: string,
  before?: Record<string, unknown>,
) {
  for (const { field } of MILESTONE_DATES) {
    if (!isMilestoneTriggered(field, status)) {
      updateData[field] = null;
      continue;
    }
    if (!updateData[field]) {
      updateData[field] = before?.[field] || todayDate();
    }
  }
}

export async function listCases(params: {
  where: Prisma.InheritanceCaseWhereInput;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  const { where, page, pageSize, sortBy, sortOrder } = params;

  const [total, cases] = await Promise.all([
    prisma.inheritanceCase.count({ where }),
    prisma.inheritanceCase.findMany({
      where,
      include: CASE_INCLUDE,
      orderBy: [{ fiscalYear: 'desc' }, { [sortBy]: sortOrder }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: cases.map(serializeCase),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getCase(id: number) {
  const caseItem = await prisma.inheritanceCase.findUnique({
    where: { id },
    include: CASE_INCLUDE,
  });
  return caseItem ? serializeCase(caseItem) : null;
}

export async function createCase(data: CreateCaseData) {
  const newCase = await prisma.$transaction(async (tx) => {
    const resolvedHeirs = await resolveHeirs(tx, data.heirs ?? []);
    const resolvedRelatedParties = resolveRelatedParties(data.relatedParties ?? []);
    const deceasedNameKana = normalizeNameKanaForStorage(data.deceasedNameKana ?? '');
    const deceasedNameKanaNormalized = normalizePersonSearchText(deceasedNameKana);
    const status = data.status ?? CASE_STATUS_OPTIONS[0];
    const referralFeeState = resolveReferralFeeState(data);
    const milestoneDates: Record<string, unknown> = {
      caseAddedDate: data.caseAddedDate ? toDate(data.caseAddedDate) : null,
      caseCompletedDate: data.caseCompletedDate ? toDate(data.caseCompletedDate) : null,
      billedDate: data.billedDate ? toDate(data.billedDate) : null,
      paidDate: data.paidDate ? toDate(data.paidDate) : null,
    };
    normalizeMilestoneDateUpdates(milestoneDates, status);

    const created = await tx.inheritanceCase.create({
      data: {
        deceasedName: data.deceasedName,
        deceasedNameKana,
        deceasedNameKanaNormalized,
        dateOfDeath: toDate(data.dateOfDeath),
        fiscalYear: data.fiscalYear,
        status,
        isUndivided: data.isUndivided ?? false,
        taxAmount: data.taxAmount ?? 0,
        feeAmount: data.feeAmount ?? 0,
        estimateAmount: data.estimateAmount ?? 0,
        propertyValue: data.propertyValue ?? 0,
        referralFeeRate: data.referralFeeRate,
        ...referralFeeState,
        landRosenkaCount: data.landRosenkaCount ?? 0,
        landBairitsuCount: data.landBairitsuCount ?? 0,
        unlistedStockCount: data.unlistedStockCount ?? 0,
        feeCalculationHeirCount: data.feeCalculationHeirCount ?? 0,
        discountAmount: data.discountAmount ?? 0,
        feeCalcSnapshot: data.feeCalcSnapshot ?? undefined,
        summary: data.summary || null,
        memo: data.memo || null,
        ...milestoneDates,
        assigneeId: data.assigneeId || null,
        internalReferrerId: data.internalReferrerId || null,
        referrerId: data.referrerId || null,
        heirs: { create: toHeirCreateData(resolvedHeirs) },
        relatedParties: { create: toRelatedPartyCreateData(resolvedRelatedParties) },
        progress: { create: toProgressCreateData(data.progress ?? []) },
        expenses: { create: toExpenseCreateData(data.expenses ?? []) },
        specialAdditions: { create: toSpecialAdditionCreateData(data.specialAdditions ?? []) },
      },
      include: CASE_INCLUDE,
    });
    await writeAuditLog(tx, 'InheritanceCase', created.id, 'CREATE');
    return created;
  });

  return serializeCase(newCase);
}

export type OptimisticLockError = { code: 'NOT_FOUND' | 'CONFLICT' };

export async function updateCase(id: number, data: Record<string, unknown>): Promise<ReturnType<typeof serializeCase>> {
  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.inheritanceCase.findUnique({ where: { id } });
    if (!before) {
      throw { _optimisticLock: true, code: 'NOT_FOUND' } as { _optimisticLock: true } & OptimisticLockError;
    }

    if (data.updatedAt && before.updatedAt.toISOString() !== data.updatedAt) {
      throw { _optimisticLock: true, code: 'CONFLICT' } as { _optimisticLock: true } & OptimisticLockError;
    }

    const updateData: Record<string, unknown> = {};
    applyScalarUpdates(updateData, data);

    if ('deceasedNameKana' in data) {
      normalizeDeceasedNameKana(updateData, data.deceasedNameKana);
    }

    const newStatus = ('status' in data ? data.status : before.status) as string;
    const beforeRec = before as unknown as Record<string, unknown>;

    Object.assign(updateData, resolveReferralFeeState(data, beforeRec));
    normalizeMilestoneDateUpdates(updateData, newStatus, beforeRec);

    if ('assigneeId' in data) updateData.assigneeId = data.assigneeId || null;
    if ('internalReferrerId' in data) updateData.internalReferrerId = data.internalReferrerId || null;
    if ('referrerId' in data) updateData.referrerId = data.referrerId || null;

    if (data.heirs !== undefined) {
      const resolvedHeirs = await resolveHeirs(tx, data.heirs as unknown[]);
      updateData.heirs = {
        deleteMany: {},
        create: toHeirCreateData(resolvedHeirs),
      };
    }
    if (data.relatedParties !== undefined) {
      const resolvedRelatedParties = resolveRelatedParties(data.relatedParties as unknown[]);
      updateData.relatedParties = {
        deleteMany: {},
        create: toRelatedPartyCreateData(resolvedRelatedParties),
      };
    }
    if (data.progress !== undefined) {
      updateData.progress = {
        deleteMany: {},
        create: toProgressCreateData(data.progress as Parameters<typeof toProgressCreateData>[0]),
      };
    }
    if (data.expenses !== undefined) {
      updateData.expenses = {
        deleteMany: {},
        create: toExpenseCreateData(data.expenses as Parameters<typeof toExpenseCreateData>[0]),
      };
    }
    if (data.specialAdditions !== undefined) {
      updateData.specialAdditions = {
        deleteMany: {},
        create: toSpecialAdditionCreateData(data.specialAdditions as Parameters<typeof toSpecialAdditionCreateData>[0]),
      };
    }

    const result = await tx.inheritanceCase.update({
      where: { id },
      data: updateData,
      include: CASE_INCLUDE,
    });

    const changes = diffScalar(before as unknown as Record<string, unknown>, result as unknown as Record<string, unknown>);
    if (changes.length > 0) {
      await writeAuditLog(tx, 'InheritanceCase', id, 'UPDATE', changes);
    }

    return result;
  });

  return serializeCase(updated);
}

export interface BulkUpsertItem {
  mode: 'create' | 'update';
  id?: number;
  data: Parameters<typeof createCase>[0];
}

export interface BulkUpsertResult {
  created: number;
  updated: number;
  failed: number;
  results: { index: number; success: boolean; error?: string }[];
}

export async function bulkUpsertCases(items: BulkUpsertItem[]): Promise<BulkUpsertResult> {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const results: BulkUpsertResult['results'] = [];

  const BATCH_SIZE = 20;
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item, batchIdx) => {
        const index = start + batchIdx;
        try {
          if (item.mode === 'update' && item.id) {
            await updateCase(item.id, item.data as Record<string, unknown>);
            updated++;
          } else {
            await createCase(item.data);
            created++;
          }
          results.push({ index, success: true });
        } catch (e) {
          failed++;
          results.push({ index, success: false, error: e instanceof Error ? e.message : '不明なエラー' });
        }
      })
    );
  }

  return { created, updated, failed, results };
}

export async function deleteCase(id: number) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.inheritanceCase.findUnique({ where: { id }, select: { deceasedName: true } });
    await tx.inheritanceCase.delete({ where: { id } });
    await writeAuditLog(
      tx,
      'InheritanceCase',
      id,
      'DELETE',
      before ? [{ field: 'deceasedName', old: before.deceasedName, new: null }] : undefined
    );
  });
}

export async function bulkDeleteCases(where: Prisma.InheritanceCaseWhereInput) {
  const ids = await prisma.inheritanceCase.findMany({ where, select: { id: true } });
  const idList = ids.map((caseItem) => caseItem.id);

  if (idList.length === 0) return 0;

  await prisma.$transaction([
    prisma.caseProgress.deleteMany({ where: { caseId: { in: idList } } }),
    prisma.caseHeir.deleteMany({ where: { caseId: { in: idList } } }),
    prisma.caseRelatedParty.deleteMany({ where: { caseId: { in: idList } } }),
    prisma.inheritanceCase.deleteMany({ where: { id: { in: idList } } }),
  ]);

  return idList.length;
}

export function isOptimisticLockError(e: unknown): e is { _optimisticLock: true } & OptimisticLockError {
  return e != null && typeof e === 'object' && '_optimisticLock' in e;
}
