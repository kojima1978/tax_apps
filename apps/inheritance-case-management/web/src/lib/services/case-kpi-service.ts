import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ACCEPTED_STATUSES, COMPLETED_STATUSES, ONGOING_STATUSES } from '@/types/constants';
import type { KPIData } from '@/lib/kpi-utils';
import { addMonths, todayDate } from './case-date-utils';

function withCondition(
  where: Prisma.InheritanceCaseWhereInput,
  condition: Prisma.InheritanceCaseWhereInput,
): Prisma.InheritanceCaseWhereInput {
  return { AND: [where, condition] };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function currentMonthRange(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function getCaseKpis(where: Prisma.InheritanceCaseWhereInput): Promise<KPIData> {
  const now = todayDate();
  const in30Days = addDays(now, 30);
  const { start, end } = currentMonthRange(now);
  const activeAcceptedStatuses = (ACCEPTED_STATUSES as readonly string[]).filter(
    (status) => !(COMPLETED_STATUSES as readonly string[]).includes(status),
  );

  const [total, ongoing, deadlineSoon, completed, addedThisMonth, completedThisMonth] = await Promise.all([
    prisma.inheritanceCase.count({ where }),
    prisma.inheritanceCase.count({
      where: withCondition(where, { status: { in: [...ONGOING_STATUSES] } }),
    }),
    prisma.inheritanceCase.count({
      where: withCondition(where, {
        status: { in: activeAcceptedStatuses },
        isUndivided: false,
        dateOfDeath: {
          gt: addMonths(now, -10),
          lte: addMonths(in30Days, -10),
        },
      }),
    }),
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

  return { total, ongoing, deadlineSoon, completed, addedThisMonth, completedThisMonth };
}
