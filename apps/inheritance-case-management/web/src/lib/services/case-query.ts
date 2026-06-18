import type { Prisma } from '@prisma/client';
import { toDate } from '@/lib/prisma-includes';
import { normalizePersonSearchText } from '@/lib/person-search';
import { ACCEPTED_STATUSES, COMPLETED_STATUSES } from '@/types/constants';
import { addMonths } from './case-date-utils';

export interface CaseWhereParams {
  status?: string;
  isUndivided?: boolean;
  hideClosed?: boolean;
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
}

function csvOrSingle(value: string): string | { in: string[] } {
  return value.includes(',') ? { in: value.split(',') } : value;
}

function appendAnd(where: Prisma.InheritanceCaseWhereInput, clause: Prisma.InheritanceCaseWhereInput) {
  const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  where.AND = [...existingAnd, clause];
}

function applySearch(where: Prisma.InheritanceCaseWhereInput, search: string) {
  const normalizedSearch = normalizePersonSearchText(search);
  appendAnd(where, {
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
  });
}

function applyStaffFilters(where: Prisma.InheritanceCaseWhereInput, params: CaseWhereParams) {
  if (params.unassigned) {
    where.assigneeId = null;
    return;
  }
  if (params.staffId) {
    where.OR = [
      { assigneeId: params.staffId },
      { internalReferrerId: params.staffId },
    ];
    return;
  }
  if (params.assigneeId) {
    where.assigneeId = params.assigneeId;
  }
  if (params.internalReferrerId) {
    where.internalReferrerId = params.internalReferrerId;
  }
}

function applyDeadlineSoon(where: Prisma.InheritanceCaseWhereInput) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  // 受託済みかつ未完了（受託・手続中）・未分割を除く案件が対象
  const activeAccepted = (ACCEPTED_STATUSES as readonly string[]).filter(
    s => !(COMPLETED_STATUSES as readonly string[]).includes(s)
  );
  appendAnd(where, { status: { in: activeAccepted } });
  appendAnd(where, { isUndivided: false });
  appendAnd(where, {
    dateOfDeath: {
      gt: addMonths(now, -10),
      lte: addMonths(in30Days, -10),
    },
  });
}

export function buildCaseWhereClause(params: CaseWhereParams): Prisma.InheritanceCaseWhereInput {
  const where: Prisma.InheritanceCaseWhereInput = {};

  if (params.status) {
    where.status = csvOrSingle(params.status);
  }
  if (params.isUndivided !== undefined) {
    where.isUndivided = params.isUndivided;
  }
  if (params.hideClosed) {
    appendAnd(where, { status: { notIn: ['見送り', '入金済'] } });
  }
  if (params.fiscalYear) {
    where.fiscalYear = params.fiscalYear;
  }
  if (params.search) {
    applySearch(where, params.search);
  }

  applyStaffFilters(where, params);

  if (params.noReferrer) {
    where.referrerId = null;
    where.internalReferrerId = where.internalReferrerId ?? null;
  } else if (params.referrerCompany) {
    where.referrer = { company: { name: params.referrerCompany } };
  }
  if (params.department) {
    where.assignee = { department: { name: params.department } };
  }
  if (params.deadlineSoon) {
    applyDeadlineSoon(where);
  }
  if (params.caseAddedFrom || params.caseAddedTo) {
    where.caseAddedDate = {
      ...(params.caseAddedFrom ? { gte: toDate(params.caseAddedFrom) } : {}),
      ...(params.caseAddedTo ? { lt: toDate(params.caseAddedTo) } : {}),
    };
  }
  if (params.caseCompletedFrom || params.caseCompletedTo) {
    where.caseCompletedDate = {
      ...(params.caseCompletedFrom ? { gte: toDate(params.caseCompletedFrom) } : {}),
      ...(params.caseCompletedTo ? { lt: toDate(params.caseCompletedTo) } : {}),
    };
  }

  return where;
}
