import type { Prisma } from '@prisma/client';
import { ACCEPTED_STATUSES, COMPLETED_STATUSES } from '@/types/constants';
import { getDeadlineDate } from '@/lib/deadline-utils';
import { todayDate } from './case-date-utils';

function nearDeathDate(target: Date, offset: number): Date {
  const candidate = new Date(target);
  candidate.setUTCMonth(candidate.getUTCMonth() - 10);
  candidate.setUTCDate(candidate.getUTCDate() + offset);
  return candidate;
}

export function buildDeadlineCondition(kind: 'soon' | 'overdue', today = todayDate()): Prisma.InheritanceCaseWhereInput {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 15); // Include today and the following 14 days.
  // Month overflow can make adjacent death dates produce non-monotonic
  // deadlines. Enumerate the small boundary window, then coalesce matching
  // dates into indexed ranges; don't assume subtracting 10 months is inverse.
  const first = nearDeathDate(today, -7);
  const last = nearDeathDate(end, 7);
  const ranges: Prisma.InheritanceCaseWhereInput[] = kind === 'overdue'
    ? [{ dateOfDeath: { lt: first } }]
    : [];
  let start: Date | undefined;
  for (const day = new Date(first); day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    const due = getDeadlineDate(day);
    const matches = kind === 'overdue' ? due < today : due >= today && due < end;
    if (matches && !start) start = new Date(day);
    if (!matches && start) {
      ranges.push({ dateOfDeath: { gte: start, lt: new Date(day) } });
      start = undefined;
    }
  }
  return {
    status: { in: ACCEPTED_STATUSES.filter(s => !(COMPLETED_STATUSES as readonly string[]).includes(s)) },
    isUndivided: false,
    OR: ranges,
  };
}
