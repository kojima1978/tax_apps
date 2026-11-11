// 社員台帳からの写しの記録（StaffDirectorySyncRun）の読み方。DB に触らない部分だけをここに置く。
// 1回の写しにつき1行。直近 RUN_HISTORY_LIMIT 回と、最後に成功した回だけを残す

/** 写しのきっかけ。directory = 台帳が保存のたびに知らせた / interval = 一覧を開いたときの5分ごと / manual = 「今すぐ読み直す」 */
export type SyncTrigger = 'directory' | 'interval' | 'manual';

export const RUN_HISTORY_LIMIT = 20;

export interface SyncRunRow {
  id: number;
  at: Date;
  trigger: string;
  ok: boolean;
  error: string | null;
  created: number;
  updated: number;
  unlinked: unknown;
}

export interface SyncRun {
  at: string;
  trigger: SyncTrigger;
  ok: boolean;
  error: string | null;
  created: number;
  updated: number;
}

export interface SyncStatus<U> extends SyncRun {
  /** 最後に成功した時刻。一度も成功していなければ null */
  lastSuccessAt: string | null;
  /** 最後に成功した回の未連携の一覧（失敗した回は一覧を作れないので、成功した回のものを出す） */
  unlinked: U[];
  /** 新しい順 */
  history: SyncRun[];
}

/** POST の本文からきっかけを読む。台帳からの知らせだけが `{ "trigger": "directory" }` を送る */
export function parseTrigger(body: unknown): SyncTrigger {
  return body !== null && typeof body === 'object' && (body as { trigger?: unknown }).trigger === 'directory' ? 'directory' : 'manual';
}

function toTrigger(raw: string): SyncTrigger {
  return raw === 'directory' || raw === 'interval' ? raw : 'manual';
}

function toRun(row: SyncRunRow): SyncRun {
  return {
    at: row.at.toISOString(),
    trigger: toTrigger(row.trigger),
    ok: row.ok,
    error: row.error,
    created: row.created,
    updated: row.updated,
  };
}

/** recent は新しい順。記録が1行も無ければ null（まだ一度も写していない） */
export function summarizeRuns<U>(recent: SyncRunRow[], lastOk: SyncRunRow | null): SyncStatus<U> | null {
  const [latest] = recent;
  if (!latest) return null;
  return {
    ...toRun(latest),
    lastSuccessAt: lastOk ? lastOk.at.toISOString() : null,
    unlinked: lastOk && Array.isArray(lastOk.unlinked) ? (lastOk.unlinked as U[]) : [],
    history: recent.map(toRun),
  };
}

/** 消してよい行の id。新しい順の id 一覧から、直近 limit 件と最後に成功した行を残す */
export function prunableRunIds(idsNewestFirst: number[], lastOkId: number | null, limit = RUN_HISTORY_LIMIT): number[] {
  return idsNewestFirst.slice(limit).filter((id) => id !== lastOkId);
}
