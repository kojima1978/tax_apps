import type { Prisma } from '@prisma/client';
import { relationshipSortFor } from '@/lib/constants/heir-relationships';

export const CASE_INCLUDE = {
  heirs: {
    include: { person: true },
    orderBy: [
      { relationshipSortOrder: 'asc' },
      { sortOrder: 'asc' },
    ],
  },
  relatedParties: { include: { person: true }, orderBy: { sortOrder: 'asc' } },
  progress: { orderBy: { sortOrder: 'asc' } },
  expenses: { orderBy: { sortOrder: 'asc' } },
  specialAdditions: { orderBy: { sortOrder: 'asc' } },
  assignee: { include: { department: true } },
  internalReferrer: { include: { department: true } },
  referrer: { include: { company: true, branch: true } },
} satisfies Prisma.InheritanceCaseInclude;

export const ASSIGNEE_INCLUDE = {
  department: true,
} as const;

export const REFERRER_INCLUDE = {
  company: true,
  branch: true,
} as const;

/** POST/PUT 用: heirs 配列を Prisma create 入力に変換 */
export function toHeirCreateData(heirs: { personId: number; relationship?: string; memo?: string }[]) {
  return heirs.map((h, i) => {
    const relationship = h.relationship ?? '';
    return {
      personId: h.personId,
      relationship,
      relationshipSortOrder: relationshipSortFor(relationship),
      memo: h.memo ?? '',
      sortOrder: i,
    };
  });
}

/** POST/PUT 用: relatedParties 配列を Prisma create 入力に変換 */
export function toRelatedPartyCreateData(parties: { personId: number; role?: string; memo?: string }[]) {
  return parties.map((p, i) => ({
    personId: p.personId,
    role: p.role ?? '',
    memo: p.memo ?? '',
    sortOrder: i,
  }));
}

/** POST/PUT 用: progress 配列を Prisma create 入力に変換 */
export function toProgressCreateData(progress: { id: string; name: string; date: string | null; memo?: string; isDynamic?: boolean }[]) {
  return progress.map((p, i) => ({
    stepId: p.id,
    name: p.name,
    date: p.date ? toDate(p.date) : null,
    memo: p.memo ?? '',
    isDynamic: p.isDynamic ?? false,
    sortOrder: i,
  }));
}

/** POST/PUT 用: expenses 配列を Prisma create 入力に変換 */
export function toExpenseCreateData(expenses: { date: string; description: string; amount: number; memo?: string | null }[]) {
  return expenses.map((e, i) => ({
    date: toDate(e.date),
    description: e.description,
    amount: e.amount,
    memo: e.memo ?? null,
    sortOrder: i,
  }));
}

export function toSpecialAdditionCreateData(additions: { description: string; amount: number }[]) {
  return additions.slice(0, 2).map((a, i) => ({
    description: a.description.trim(),
    amount: a.amount,
    sortOrder: i,
  }));
}

// ── Date ↔ String 変換ヘルパー ──────────────────────────────

/** YYYY-MM-DD 文字列 → Date（Prisma書込用） */
export function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

/** Date → YYYY-MM-DD 文字列（APIレスポンス用） */
export function toDateStr(date: Date | string | null): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date.substring(0, 10);
  return date.toISOString().split('T')[0];
}

/** Prisma の案件データを API レスポンス形式に変換（Date→文字列） */
export function serializeCase<T extends { dateOfDeath: Date | string; caseAddedDate?: Date | string | null; caseCompletedDate?: Date | string | null; progress?: { date: Date | string | null }[]; expenses?: { date: Date | string }[] }>(c: T): T {
  return {
    ...c,
    dateOfDeath: toDateStr(c.dateOfDeath as Date) ?? '',
    caseAddedDate: toDateStr(c.caseAddedDate as Date | null) ?? null,
    caseCompletedDate: toDateStr(c.caseCompletedDate as Date | null) ?? null,
    progress: c.progress?.map(p => ({
      ...p,
      date: toDateStr(p.date as Date | null),
    })),
    expenses: c.expenses?.map(e => ({
      ...e,
      date: toDateStr(e.date as Date) ?? '',
    })),
  };
}
