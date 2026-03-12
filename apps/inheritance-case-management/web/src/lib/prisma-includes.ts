export const CASE_INCLUDE = {
  contacts: { orderBy: { sortOrder: 'asc' as const } },
  progress: { orderBy: { sortOrder: 'asc' as const } },
  assignee: true,
  referrer: true,
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
    date: p.date,
    memo: p.memo ?? '',
    isDynamic: p.isDynamic ?? false,
    sortOrder: i,
  }));
}
