import { LINKED_APP_TARGETS, type LinkedAppKey } from '../server/linkedApps';

// 台帳を使うアプリの一覧（「連携」の画面と、復元の前の確かめの両方がここを読む）。
// どのアプリも同じゲートウェイの下なので、ブラウザから直接読む。
// 写しを持つアプリの一覧は server/linkedApps.ts にだけ持つ（保存のたびの知らせと同じ一覧を使う）

/**
 * 台帳の写しを持つアプリ。担当者を台帳ID（staffDirectoryId）で覚えているので、
 * 復元で台帳から消える ID はそのアプリでは「台帳に居ない人」になり、復元後に同じ ID で
 * 別の人が登録されると、その人の名前で写し直されてしまう。復元の前に人数と名前を見せる。
 */
export type LinkedApp = {
  key: LinkedAppKey;
  label: string;
  /** そのアプリの担当者の画面（未連携の人を直す場所） */
  page: string;
  /** 担当者の一覧（台帳ID つき）。復元の前の確かめに使う */
  copiesUrl: string;
  /** 写しの状況。GET は記録を読むだけ、POST は今すぐ写し直す */
  syncUrl: string;
  /** 台帳に居ない担当者の直し方 */
  unlinkedFix: string;
};

export const LINKED_APPS: LinkedApp[] = LINKED_APP_TARGETS.map((t) => ({
  key: t.key,
  label: t.label,
  page: t.basePath + t.pagePath,
  copiesUrl: t.basePath + t.copiesPath,
  syncUrl: t.basePath + t.syncPath,
  unlinkedFix: t.unlinkedFix,
}));

/** 写しを持たず、画面から台帳を直接読むアプリ（台帳の変更は次に画面を開いたときに見える） */
export type ReadingApp = { label: string; url: string; uses: string };

export const READING_APPS: ReadingApp[] = [
  { label: '株式評価明細書', url: '/stock-valuation-form/', uses: '操作者・案件の担当者' },
  { label: '預貯金分析', url: '/bank-analyzer/', uses: '操作者・案件の担当者・事務所情報' },
  { label: '必要書類管理', url: '/inheritance-tax-docs/', uses: '操作者・事務所情報' },
  { label: '相続税計算', url: '/inheritance-tax-app/', uses: '事務所情報' },
  { label: '贈与税計算', url: '/gift-tax-simulator/', uses: '事務所情報' },
  { label: '退職金税額計算', url: '/retirement-tax-calc/', uses: '事務所情報（印刷）' },
  { label: '譲渡所得税計算', url: '/capital-gains-calc/', uses: '事務所情報（印刷）' },
  { label: '減価償却ツール', url: '/depreciation-calc/', uses: '事務所情報（印刷）' },
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
        const res = await fetch(app.copiesUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        const copies = res.ok ? parseLinkedCopies(await res.json()) : null;
        return { app, lost: copies ? lostCopies(copies, restoredIds) : 'unreachable' };
      } catch {
        return { app, lost: 'unreachable' };
      }
    }),
  );
}

// ---- 写しの状況（「連携」の画面） ----

/** 写しのきっかけ。directory = 台帳からの知らせ / interval = 一覧を開いたときの5分ごと / manual = 手動・復元 */
export type SyncTrigger = 'directory' | 'interval' | 'manual';

export type SyncRun = {
  /** 写し直そうとした時刻（失敗した回も含む） */
  at: string;
  trigger: SyncTrigger;
  ok: boolean;
  error: string | null;
  created: number;
  updated: number;
};

export type SyncStatus = SyncRun & {
  /** 最後に成功した時刻。一度も成功していなければ null */
  lastSuccessAt: string | null;
  /** 台帳に居ない（台帳ID の無い）担当者。最後に成功した回のもの */
  unlinked: { id: number; name: string }[];
  /** 直近の試行（新しい順） */
  history: SyncRun[];
};

export const TRIGGER_LABEL: Record<SyncTrigger, string> = {
  directory: '台帳からの知らせ',
  interval: '5分ごと',
  manual: '手動',
};

/** 'never' = まだ一度も写していない / 'unreachable' = 止まっている・形が違う */
export type SyncState = SyncStatus | 'never' | 'unreachable';

function parseRun(body: unknown): SyncRun | null {
  if (typeof body !== 'object' || body === null) return null;
  const r = body as Record<string, unknown>;
  if (typeof r.ok !== 'boolean' || typeof r.at !== 'string') return null;
  const count = (v: unknown) => (typeof v === 'number' ? v : 0);
  return {
    at: r.at,
    trigger: r.trigger === 'directory' || r.trigger === 'interval' ? r.trigger : 'manual',
    ok: r.ok,
    error: typeof r.error === 'string' && r.error !== '' ? r.error : null,
    created: count(r.created),
    updated: count(r.updated),
  };
}

/**
 * 各アプリの写しの状況を読む。未連携の人のキー名はアプリで違う
 * （案件管理は unlinkedAssignees、資産・負債管理は unlinkedStaff）
 */
export function parseSyncStatus(body: unknown): SyncState {
  if (body === null) return 'never';
  if (typeof body !== 'object' || Array.isArray(body)) return 'unreachable';
  const latest = parseRun(body);
  if (!latest) return 'unreachable';
  const r = body as Record<string, unknown>;
  const list = Array.isArray(r.unlinkedAssignees) ? r.unlinkedAssignees : Array.isArray(r.unlinkedStaff) ? r.unlinkedStaff : [];
  return {
    ...latest,
    lastSuccessAt: typeof r.lastSuccessAt === 'string' ? r.lastSuccessAt : null,
    history: Array.isArray(r.history) ? r.history.flatMap((h) => parseRun(h) ?? []) : [latest],
    unlinked: list.flatMap((row) => {
      const v = row as Record<string, unknown> | null;
      return v && typeof v.id === 'number' ? [{ id: v.id, name: typeof v.name === 'string' ? v.name : '' }] : [];
    }),
  };
}

/** 保存のたびの知らせの状況（台帳のサーバが持つ。再起動で空に戻る） */
export type NotifyResult = { key: LinkedAppKey; at: string; ok: boolean; synced: boolean | null; error: string | null };
export type NotifyStatus = { enabled: boolean; pending: boolean; lastChangeAt: string | null; results: NotifyResult[] };

export async function fetchNotifyStatus(): Promise<NotifyStatus | null> {
  try {
    const res = await fetch('/staff-directory/api/notify', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as NotifyStatus) : null;
  } catch {
    return null;
  }
}

// 「今すぐ読み直す」は人が押して待っているので、写し直しの時間（アプリ側で最大3秒＋DB）ぶん長めに待つ
const RESYNC_TIMEOUT_MS = 10_000;

/** force = 期限を待たずに写し直させる（POST） */
export async function fetchSyncState(app: LinkedApp, force = false): Promise<SyncState> {
  try {
    const res = await fetch(app.syncUrl, {
      method: force ? 'POST' : 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(force ? RESYNC_TIMEOUT_MS : TIMEOUT_MS),
    });
    return res.ok ? parseSyncStatus(await res.json()) : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

/** 「3分前」。未来（時計のずれ）は「たった今」に寄せる */
export function relativeTime(at: string, now: number): string {
  const sec = Math.max(0, Math.floor((now - new Date(at).getTime()) / 1000));
  if (sec < 60) return 'たった今';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  return `${Math.floor(hour / 24)}日前`;
}
