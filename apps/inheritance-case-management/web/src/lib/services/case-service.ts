import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CASE_INCLUDE, toContactCreateData, toProgressCreateData, toExpenseCreateData, toDate, serializeCase } from '@/lib/prisma-includes';

export function buildCaseWhereClause(params: {
  status?: string;
  handlingStatus?: string;
  acceptanceStatus?: string;
  fiscalYear?: number;
  search?: string;
  assigneeId?: number;
  internalReferrerId?: number;
  staffId?: number;
  referrerCompany?: string;
  unassigned?: boolean;
  noReferrer?: boolean;
  department?: string;
}): Prisma.InheritanceCaseWhereInput {
  const where: Prisma.InheritanceCaseWhereInput = {};
  const { status, handlingStatus, acceptanceStatus, fiscalYear, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, department } = params;

  if (status) {
    where.status = status.includes(',') ? { in: status.split(',') } : status;
  }
  if (handlingStatus) {
    where.handlingStatus = handlingStatus.includes(',') ? { in: handlingStatus.split(',') } : handlingStatus;
  }
  if (acceptanceStatus) {
    where.acceptanceStatus = acceptanceStatus.includes(',') ? { in: acceptanceStatus.split(',') } : acceptanceStatus;
  }
  if (fiscalYear) {
    where.fiscalYear = fiscalYear;
  }
  if (search) {
    where.deceasedName = { contains: search, mode: 'insensitive' };
  }
  if (unassigned) {
    where.assigneeId = null;
  } else if (staffId) {
    where.OR = [
      { assigneeId: staffId },
      { internalReferrerId: staffId },
    ];
  } else {
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }
    if (internalReferrerId) {
      where.internalReferrerId = internalReferrerId;
    }
  }
  if (noReferrer) {
    where.referrerId = null;
    where.internalReferrerId = where.internalReferrerId ?? null;
  } else if (referrerCompany) {
    where.referrer = { company: { name: referrerCompany } };
  }
  if (department) {
    where.assignee = { department: { name: department } };
  }
  return where;
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

export async function createCase(data: {
  deceasedName: string;
  dateOfDeath: string;
  fiscalYear: number;
  status?: string;
  handlingStatus?: string;
  acceptanceStatus?: string;
  taxAmount?: number;
  feeAmount?: number;
  estimateAmount?: number;
  propertyValue?: number;
  referralFeeRate?: number | null;
  referralFeeAmount?: number | null;
  summary?: string | null;
  memo?: string | null;
  assigneeId?: number | null;
  internalReferrerId?: number | null;
  referrerId?: number | null;
  contacts?: { name: string; phone: string; postalCode?: string; address?: string; memo?: string }[];
  progress?: { id: string; name: string; date: string | null; memo?: string; isDynamic?: boolean }[];
  expenses?: { date: string; description: string; amount: number; memo?: string | null }[];
}) {
  const newCase = await prisma.inheritanceCase.create({
    data: {
      deceasedName: data.deceasedName,
      dateOfDeath: toDate(data.dateOfDeath),
      fiscalYear: data.fiscalYear,
      status: data.status ?? '未着手',
      handlingStatus: data.handlingStatus ?? '対応中',
      acceptanceStatus: data.acceptanceStatus ?? '未判定',
      taxAmount: data.taxAmount ?? 0,
      feeAmount: data.feeAmount ?? 0,
      estimateAmount: data.estimateAmount ?? 0,
      propertyValue: data.propertyValue ?? 0,
      referralFeeRate: data.referralFeeRate,
      referralFeeAmount: data.referralFeeAmount,
      summary: data.summary || null,
      memo: data.memo || null,
      assigneeId: data.assigneeId || null,
      internalReferrerId: data.internalReferrerId || null,
      referrerId: data.referrerId || null,
      contacts: { create: toContactCreateData(data.contacts ?? []) },
      progress: { create: toProgressCreateData(data.progress ?? []) },
      expenses: { create: toExpenseCreateData(data.expenses ?? []) },
    },
    include: CASE_INCLUDE,
  });

  return serializeCase(newCase);
}

export type OptimisticLockError = { code: 'NOT_FOUND' | 'CONFLICT' };

export async function updateCase(id: number, data: Record<string, unknown>): Promise<ReturnType<typeof serializeCase>> {
  const updated = await prisma.$transaction(async (tx) => {
    if (data.updatedAt) {
      const current = await tx.inheritanceCase.findUnique({
        where: { id },
        select: { updatedAt: true },
      });
      if (!current) {
        throw { _optimisticLock: true, code: 'NOT_FOUND' } as { _optimisticLock: true } & OptimisticLockError;
      }
      if (current.updatedAt.toISOString() !== data.updatedAt) {
        throw { _optimisticLock: true, code: 'CONFLICT' } as { _optimisticLock: true } & OptimisticLockError;
      }
    }

    const updateData: Record<string, unknown> = {};

    const scalarFields = [
      'deceasedName', 'dateOfDeath', 'fiscalYear', 'status', 'handlingStatus', 'acceptanceStatus',
      'taxAmount', 'feeAmount', 'estimateAmount', 'propertyValue',
      'referralFeeRate', 'referralFeeAmount', 'summary', 'memo',
      'landRosenkaCount', 'landBairitsuCount', 'unlistedStockCount', 'heirCount', 'discountAmount',
    ] as const;

    for (const field of scalarFields) {
      if (field in data) {
        if (field === 'dateOfDeath') {
          updateData[field] = toDate(data[field] as string);
        } else {
          updateData[field] = data[field as keyof typeof data];
        }
      }
    }

    if ('assigneeId' in data) updateData.assigneeId = data.assigneeId || null;
    if ('internalReferrerId' in data) updateData.internalReferrerId = data.internalReferrerId || null;
    if ('referrerId' in data) updateData.referrerId = data.referrerId || null;

    if (data.contacts !== undefined) {
      updateData.contacts = {
        deleteMany: {},
        create: toContactCreateData(data.contacts as Parameters<typeof toContactCreateData>[0]),
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

    return tx.inheritanceCase.update({
      where: { id },
      data: updateData,
      include: CASE_INCLUDE,
    });
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
  await prisma.inheritanceCase.delete({ where: { id } });
}

export async function bulkDeleteCases(where: Prisma.InheritanceCaseWhereInput) {
  const ids = await prisma.inheritanceCase.findMany({ where, select: { id: true } });
  const idList = ids.map(c => c.id);

  if (idList.length === 0) return 0;

  await prisma.$transaction([
    prisma.caseProgress.deleteMany({ where: { caseId: { in: idList } } }),
    prisma.caseContact.deleteMany({ where: { caseId: { in: idList } } }),
    prisma.inheritanceCase.deleteMany({ where: { id: { in: idList } } }),
  ]);

  return idList.length;
}

export function isOptimisticLockError(e: unknown): e is { _optimisticLock: true } & OptimisticLockError {
  return e != null && typeof e === 'object' && '_optimisticLock' in e;
}
