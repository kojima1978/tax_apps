import { COMPLETED_STATUSES, HANDLING_STATUS_OPTIONS } from '@/types/constants';

export function todayDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isCompletionDateTrigger(status?: string | null, handlingStatus?: string | null): boolean {
  return Boolean(status && (COMPLETED_STATUSES as readonly string[]).includes(status))
    || handlingStatus === HANDLING_STATUS_OPTIONS[1]
    || handlingStatus === HANDLING_STATUS_OPTIONS[2];
}
