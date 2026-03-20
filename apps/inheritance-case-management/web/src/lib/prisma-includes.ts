export const CASE_INCLUDE = {
  contacts: { orderBy: { sortOrder: 'asc' as const } },
  progress: { orderBy: { sortOrder: 'asc' as const } },
  assignee: true,
  referrer: { include: { company: true } },
} as const;

export const REFERRER_INCLUDE = {
  company: true,
} as const;

/** POST/PUT 用: contacts 配列を Prisma create 入力に変換 */
export function toContactCreateData(contacts: { name: string; phone: string; email: string }[]) {
  return contacts.map((c, i) => ({
    name: c.name,
    phone: c.phone,
    email: c.email,
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
export function serializeCase<T extends { dateOfDeath: Date | string; progress?: { date: Date | string | null }[] }>(c: T): T {
  return {
    ...c,
    dateOfDeath: toDateStr(c.dateOfDeath as Date) ?? '',
    progress: c.progress?.map(p => ({
      ...p,
      date: toDateStr(p.date as Date | null),
    })),
  };
}
