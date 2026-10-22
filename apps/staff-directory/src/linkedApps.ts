// 台帳の写しを持つアプリ。担当者を台帳ID（staffDirectoryId）で覚えているので、
// 復元で台帳から消える ID はそのアプリでは「台帳に居ない人」になり、復元後に同じ ID で
// 別の人が登録されると、その人の名前で写し直されてしまう。復元の前に人数と名前を見せる。
// どちらの一覧も同じゲートウェイの下なので、ブラウザから直接読む

export type LinkedApp = { label: string; url: string };

export const LINKED_APPS: LinkedApp[] = [
  { label: '相続税案件管理', url: '/itcm/api/assignees' },
  { label: 'ファミリーB/S', url: '/private-banking/api/staff' },
];

const TIMEOUT_MS = 3000;

export type LinkedCopy = { staffDirectoryId: number; name: string };

/** 'unreachable' = 止まっている・形が違う（確かめられなかった） */
export type LinkedImpact = { app: LinkedApp; lost: LinkedCopy[] | 'unreachable' };

/** アプリの一覧から台帳ID の付いた担当者だけ取り出す。形が違えば null */
export function parseLinkedCopies(body: unknown): LinkedCopy[] | null {
  if (!Array.isArray(body)) return null;
  return body.flatMap((row): LinkedCopy[] => {
    if (typeof row !== 'object' || row === null) return [];
    const r = row as Record<string, unknown>;
    if (!Number.isInteger(r.staffDirectoryId)) return [];
    return [{ staffDirectoryId: r.staffDirectoryId as number, name: typeof r.name === 'string' ? r.name : '' }];
  });
}

/** 復元するファイルに入っている社員の台帳ID（ファイルの形はサーバの preview で確かめる） */
export function backupStaffIds(backup: unknown): Set<number> {
  const staff = (backup as { staff?: unknown } | null)?.staff;
  if (!Array.isArray(staff)) return new Set();
  return new Set(staff.flatMap((s) => (Number.isInteger((s as { id?: unknown } | null)?.id) ? [(s as { id: number }).id] : [])));
}

/** 写しのうち、復元後の台帳に居なくなる人（台帳ID 順） */
export function lostCopies(copies: LinkedCopy[], restoredIds: Set<number>): LinkedCopy[] {
  return copies.filter((c) => !restoredIds.has(c.staffDirectoryId)).sort((a, b) => a.staffDirectoryId - b.staffDirectoryId);
}

export async function checkLinkedApps(backup: unknown): Promise<LinkedImpact[]> {
  const restoredIds = backupStaffIds(backup);
  return Promise.all(
    LINKED_APPS.map(async (app): Promise<LinkedImpact> => {
      try {
        const res = await fetch(app.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        const copies = res.ok ? parseLinkedCopies(await res.json()) : null;
        return { app, lost: copies ? lostCopies(copies, restoredIds) : 'unreachable' };
      } catch {
        return { app, lost: 'unreachable' };
      }
    }),
  );
}
