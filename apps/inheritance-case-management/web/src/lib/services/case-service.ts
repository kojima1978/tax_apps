import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizePersonAddressParts } from '@/lib/person-address';
import { normalizeNameKanaForStorage, normalizePersonSearchText } from '@/lib/person-search';
import { CASE_INCLUDE, toHeirCreateData, toRelatedPartyCreateData, toProgressCreateData, toExpenseCreateData, toSpecialAdditionCreateData, toDate, serializeCase } from '@/lib/prisma-includes';
import { ACCEPTANCE_STATUS_OPTIONS, COMPLETED_STATUSES, HANDLING_STATUS_OPTIONS } from '@/types/constants';
import { writeAuditLog, diffScalar } from './audit-service';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

function todayDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

type HeirInput = { personId: number; relationship?: string; memo?: string };
type RelatedPartyInput = { personId: number; memo?: string };
type ImportHeirInput = {
  name: string;
  nameKana?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressFromPostalCode?: string;
  addressManual?: string;
  dateOfBirth?: string;
  relationship?: string;
  memo?: string;
};

function isImportHeir(c: unknown): c is ImportHeirInput {
  return c != null && typeof c === 'object' && 'name' in c && !('personId' in c);
}

async function resolveHeirs(tx: TxClient, heirs: unknown[]): Promise<HeirInput[]> {
  const result: HeirInput[] = [];
  for (const c of heirs) {
    if (isImportHeir(c)) {
      const nameKana = normalizeNameKanaForStorage(c.nameKana ?? '');
      const addressParts = normalizePersonAddressParts(c);
      let person = await tx.heirPerson.findFirst({
        where: {
          name: c.name,
          ...(nameKana ? { nameKana } : {}),
          phone: c.phone ?? '',
          postalCode: c.postalCode ?? '',
          address: addressParts.address,
        },
      });
      const dob = c.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(c.dateOfBirth)
        ? new Date(c.dateOfBirth + 'T00:00:00.000Z')
        : null;
      if (!person) {
        person = await tx.heirPerson.create({
          data: {
            name: c.name,
            nameKana,
            nameKanaNormalized: normalizePersonSearchText(nameKana),
            dateOfBirth: dob,
            phone: c.phone ?? '',
            postalCode: c.postalCode ?? '',
            address: addressParts.address,
            addressFromPostalCode: addressParts.addressFromPostalCode,
            addressManual: addressParts.addressManual,
            memo: c.memo ?? '',
          },
        });
      } else if (dob && !person.dateOfBirth) {
        person = await tx.heirPerson.update({
          where: { id: person.id },
          data: { dateOfBirth: dob },
        });
      }
      result.push({ personId: person.id, relationship: c.relationship, memo: c.memo });
    } else {
      result.push(c as HeirInput);
    }
  }
  return result;
}

function resolveRelatedParties(parties: unknown[]): RelatedPartyInput[] {
  return parties.map(p => p as RelatedPartyInput);
}

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
  deadlineSoon?: boolean;
  department?: string;
  caseAddedFrom?: string;
  caseAddedTo?: string;
  caseCompletedFrom?: string;
  caseCompletedTo?: string;
}): Prisma.InheritanceCaseWhereInput {
  const where: Prisma.InheritanceCaseWhereInput = {};
  const {
    status,
    handlingStatus,
    acceptanceStatus,
    fiscalYear,
    search,
    assigneeId,
    internalReferrerId,
    staffId,
    referrerCompany,
    unassigned,
    noReferrer,
    deadlineSoon,
    department,
    caseAddedFrom,
    caseAddedTo,
    caseCompletedFrom,
    caseCompletedTo,
  } = params;

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
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    const normalizedSearch = normalizePersonSearchText(search);
    where.AND = [
      ...existingAnd,
      {
        OR: [
          { deceasedName: { contains: search, mode: 'insensitive' } },
          { deceasedNameKana: { contains: search, mode: 'insensitive' } },
          ...(normalizedSearch
            ? [{ deceasedNameKanaNormalized: { contains: normalizedSearch } }]
            : []),
          { heirs: { some: { person: { name: { contains: search, mode: 'insensitive' } } } } },
          { heirs: { some: { person: { nameKana: { contains: search, mode: 'insensitive' } } } } },
          ...(normalizedSearch
            ? [{ heirs: { some: { person: { nameKanaNormalized: { contains: normalizedSearch } } } } }]
            : []),
        ],
      },
    ];
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
  if (deadlineSoon) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...existingAnd,
      { acceptanceStatus: ACCEPTANCE_STATUS_OPTIONS[1] },
      { status: { notIn: [...COMPLETED_STATUSES] } },
      { handlingStatus: HANDLING_STATUS_OPTIONS[0] },
      {
        dateOfDeath: {
          gt: addMonths(now, -10),
          lte: addMonths(in30Days, -10),
        },
      },
    ];
  }
  if (caseAddedFrom || caseAddedTo) {
    where.caseAddedDate = {
      ...(caseAddedFrom ? { gte: toDate(caseAddedFrom) } : {}),
      ...(caseAddedTo ? { lt: toDate(caseAddedTo) } : {}),
    };
  }
  if (caseCompletedFrom || caseCompletedTo) {
    where.caseCompletedDate = {
      ...(caseCompletedFrom ? { gte: toDate(caseCompletedFrom) } : {}),
      ...(caseCompletedTo ? { lt: toDate(caseCompletedTo) } : {}),
    };
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
  deceasedNameKana?: string;
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
  estimateReferralFeeAmount?: number | null;
  landRosenkaCount?: number;
  landBairitsuCount?: number;
  unlistedStockCount?: number;
  heirCount?: number;
  discountAmount?: number;
  feeCalcSnapshot?: Prisma.InputJsonValue | null;
  summary?: string | null;
  memo?: string | null;
  caseAddedDate?: string | null;
  assigneeId?: number | null;
  internalReferrerId?: number | null;
  referrerId?: number | null;
  heirs?: unknown[];
  relatedParties?: unknown[];
  progress?: { id: string; name: string; date: string | null; memo?: string; isDynamic?: boolean }[];
  expenses?: { date: string; description: string; amount: number; memo?: string | null }[];
  specialAdditions?: { description: string; amount: number }[];
}) {
  const newCase = await prisma.$transaction(async (tx) => {
    const resolvedHeirs = await resolveHeirs(tx, data.heirs ?? []);
    const resolvedRelatedParties = resolveRelatedParties(data.relatedParties ?? []);
    const deceasedNameKana = normalizeNameKanaForStorage(data.deceasedNameKana ?? '');
    const deceasedNameKanaNormalized = normalizePersonSearchText(deceasedNameKana);
    const created = await tx.inheritanceCase.create({
      data: {
        deceasedName: data.deceasedName,
        deceasedNameKana,
        deceasedNameKanaNormalized,
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
        estimateReferralFeeAmount: data.estimateReferralFeeAmount,
        landRosenkaCount: data.landRosenkaCount ?? 0,
        landBairitsuCount: data.landBairitsuCount ?? 0,
        unlistedStockCount: data.unlistedStockCount ?? 0,
        heirCount: data.heirCount ?? 0,
        discountAmount: data.discountAmount ?? 0,
        feeCalcSnapshot: data.feeCalcSnapshot ?? undefined,
        summary: data.summary || null,
        memo: data.memo || null,
        caseAddedDate: data.caseAddedDate ? toDate(data.caseAddedDate) : todayDate(),
        caseCompletedDate: (COMPLETED_STATUSES as readonly string[]).includes(data.status ?? '未着手')
          || (data.handlingStatus === '対応終了' || data.handlingStatus === '対応終了（未分割）')
          ? todayDate() : null,
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

    const scalarFields = [
      'deceasedName', 'deceasedNameKana', 'dateOfDeath', 'fiscalYear', 'status', 'handlingStatus', 'acceptanceStatus',
      'taxAmount', 'feeAmount', 'estimateAmount', 'propertyValue',
      'referralFeeRate', 'referralFeeAmount', 'estimateReferralFeeAmount', 'summary', 'memo',
      'landRosenkaCount', 'landBairitsuCount', 'unlistedStockCount', 'heirCount', 'discountAmount',
      'feeCalcSnapshot', 'caseAddedDate', 'caseCompletedDate',
    ] as const;

    const dateFields = new Set(['dateOfDeath', 'caseAddedDate', 'caseCompletedDate']);
    for (const field of scalarFields) {
      if (field in data) {
        if (dateFields.has(field)) {
          const value = data[field];
          updateData[field] = value ? toDate(value as string) : null;
        } else {
          updateData[field] = data[field as keyof typeof data];
        }
      }
    }

    if ('deceasedNameKana' in data) {
      const normalized = normalizeNameKanaForStorage((data.deceasedNameKana as string) ?? '');
      updateData.deceasedNameKana = normalized;
      updateData.deceasedNameKanaNormalized = normalizePersonSearchText(normalized);
    }

    // 受託 → caseAddedDate 自動セット
    if ('acceptanceStatus' in data && data.acceptanceStatus === '受託') {
      if (!before.caseAddedDate && !('caseAddedDate' in data)) {
        updateData.caseAddedDate = todayDate();
      }
    }

    // caseCompletedDate 自動セット: status完了系 or handlingStatus対応終了系
    {
      const newStatus = ('status' in data ? data.status : before.status) as string;
      const newHandling = ('handlingStatus' in data ? data.handlingStatus : before.handlingStatus) as string;
      const statusCompleted = (COMPLETED_STATUSES as readonly string[]).includes(newStatus);
      const handlingCompleted = newHandling === '対応終了' || newHandling === '対応終了（未分割）';

      if (statusCompleted || handlingCompleted) {
        if (!before.caseCompletedDate && !('caseCompletedDate' in data)) {
          updateData.caseCompletedDate = todayDate();
        }
      } else if ('status' in data || 'handlingStatus' in data) {
        if (before.caseCompletedDate && !('caseCompletedDate' in data)) {
          updateData.caseCompletedDate = null;
        }
      }
    }

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
    await writeAuditLog(tx, 'InheritanceCase', id, 'DELETE', before ? [{ field: 'deceasedName', old: before.deceasedName, new: null }] : undefined);
  });
}

export async function bulkDeleteCases(where: Prisma.InheritanceCaseWhereInput) {
  const ids = await prisma.inheritanceCase.findMany({ where, select: { id: true } });
  const idList = ids.map(c => c.id);

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
