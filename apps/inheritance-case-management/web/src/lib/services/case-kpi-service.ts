import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COMPLETED_STATUSES, ONGOING_STATUSES } from '@/types/constants';
import type { KPIData } from '@/lib/kpi-utils';
import { todayDate } from './case-date-utils';
import { buildDeadlineCondition } from './case-deadline-query';

function withCondition(
  where: Prisma.InheritanceCaseWhereInput,
  condition: Prisma.InheritanceCaseWhereInput,
): Prisma.InheritanceCaseWhereInput {
  return { AND: [where, condition] };
}

function currentMonthRange(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function getCaseKpis(where: Prisma.InheritanceCaseWhereInput): Promise<KPIData> {
  const now = todayDate();
  const { start, end } = currentMonthRange(now);
  const [total, ongoing, deadlineSoon, deadlineOverdue, completed, addedThisMonth, completedThisMonth] = await Promise.all([
    prisma.inheritanceCase.count({ where }),
    prisma.inheritanceCase.count({
      where: withCondition(where, { status: { in: [...ONGOING_STATUSES] } }),
    }),
    prisma.inheritanceCase.count({ where: withCondition(where, buildDeadlineCondition('soon', now)) }),
    prisma.inheritanceCase.count({ where: withCondition(where, buildDeadlineCondition('overdue', now)) }),
    prisma.inheritanceCase.count({
      where: withCondition(where, { status: { in: [...COMPLETED_STATUSES] } }),
    }),
    prisma.inheritanceCase.count({
      where: withCondition(where, { caseAddedDate: { gte: start, lt: end } }),
    }),
    prisma.inheritanceCase.count({
      where: withCondition(where, { caseCompletedDate: { gte: start, lt: end } }),
    }),
  ]);

  return { total, ongoing, deadlineSoon, deadlineOverdue, completed, addedThisMonth, completedThisMonth };
}
