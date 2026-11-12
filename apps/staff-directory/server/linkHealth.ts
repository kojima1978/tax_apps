import type Database from 'better-sqlite3';
import {
  LINKED_APP_TARGETS,
  LINK_CHECK_KIND_LABEL,
  LINKS_PAGE_URL,
  WORKLOAD_SOURCES,
  type LinkCheckKind,
  type LinkedAppKey,
  type WorkloadSourceKey,
} from './linkedApps.js';
import type { NotifyResult } from './notify.js';

// 連携の見張り。台帳のサーバが5分ごとに各アプリの口を読み（読むだけ）、失敗の始まりと終わりを台帳の DB に残す。
//   - 写し（sync）: 写しを持つアプリの GET …/api/staff-directory。最後の写し直しが失敗している、
//     または台帳からの知らせが届かず、その後も写せていない ── のどちらかで失敗
//   - 担当件数（workload）: 4アプリの GET …/api/staff-directory/workload。読めなければ失敗
// 画面（社員一覧・部署・会社・連携）は「いつから」をここから読み、デスクトップの警告は
// manage.sh link-check が /api/link-health/alerts を読んで出す（しきい値は向こうが渡す）。
// 一時的な失敗（再起動の数分）で鳴らさないのは、警告の側が「〇分以上続いている」だけを拾うことで受ける

export const CHECK_INTERVAL_MS = 5 * 60_000;
// 全アプリが一緒に起動したとき、相手が上がりきる前に読んで「失敗」を残さないよう、最初の1回は少し待つ
export const FIRST_CHECK_DELAY_MS = 60_000;
const TIMEOUT_MS = 5000;
/** 終わった失敗を、アプリ×見張りごとに何件まで残すか */
export const KEEP_CLOSED_PER_CHECK = 20;

export type LinkCheck = {
  app: WorkloadSourceKey;
  label: string;
  kind: LinkCheckKind;
  url: string;
};

export type CheckResult = { ok: true } | { ok: false; reason: string };

export type LinkIncident = {
  id: number;
  app: WorkloadSourceKey;
  label: string;
  kind: LinkCheckKind;
  startedAt: string;
  /** 続いている間は null */
  endedAt: string | null;
  reason: string;
  lastCheckedAt: string;
};

export type LinkCheckState = {
  app: WorkloadSourceKey;
  label: string;
  kind: LinkCheckKind;
  /** unchecked = 台帳を起動してからまだ読んでいない（続いている失敗の記録も無い） */
  state: 'ok' | 'failed' | 'unchecked';
  /** 失敗が続いているときだけ */
  since: string | null;
  reason: string | null;
  lastCheckedAt: string | null;
};

export type LinksStatus = {
  checkedAt: string | null;
  intervalMs: number;
  checks: LinkCheckState[];
  /** 失敗の記録（新しい順・続いているものも含む） */
  incidents: LinkIncident[];
};

/**
 * 見張る口の一覧（server/linkedApps.ts から作る。一覧はあちらの1か所だけ）。
 * 写しの口は知らせの送り先（resolveTargets ＝ LINKED_APP_ORIGINS）と同じものを読む ── 知らせを止めたアプリは見張らない
 */
export function buildChecks(
  syncTargets: { key: LinkedAppKey; label: string; url: string }[] = LINKED_APP_TARGETS.map((t) => ({
    key: t.key,
    label: t.label,
    url: `${t.defaultOrigin}${t.basePath}${t.syncPath}`,
  })),
): LinkCheck[] {
  return [
    ...syncTargets.map((t): LinkCheck => ({ app: t.key, label: t.label, kind: 'sync', url: t.url })),
    ...WORKLOAD_SOURCES.map((s): LinkCheck => ({
      app: s.key,
      label: s.label,
      kind: 'workload',
      url: `${s.defaultOrigin}${s.basePath}/api/staff-directory/workload`,
    })),
  ];
}

const labelOf = new Map<string, string>(WORKLOAD_SOURCES.map((s) => [s.key, s.label]));

function fetchError(e: unknown): string {
  return e instanceof Error && e.name === 'TimeoutError'
    ? `${TIMEOUT_MS / 1000} 秒以内に応答しませんでした`
    : '接続できませんでした（止まっているかもしれません）';
}

/**
 * 写しの状況を判定する。body は各アプリの GET …/api/staff-directory の応答（null = まだ一度も写していない ＝ 失敗ではない）。
 * 知らせの失敗は、そのあと写せていれば（相手の5分ごとの写し直しで追いついていれば）失敗にしない
 */
export function judgeSync(body: unknown, notify: NotifyResult | undefined): CheckResult {
  if (body === null) return { ok: true };
  if (typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: '返ってきた形が違います' };
  const r = body as Record<string, unknown>;
  if (typeof r.ok !== 'boolean') return { ok: false, reason: '返ってきた形が違います' };
  if (!r.ok) return { ok: false, reason: `写し直しに失敗しています（${typeof r.error === 'string' && r.error ? r.error : '理由は返ってきませんでした'}）` };
  const notifyFailed = notify && (!notify.ok || notify.synced === false);
  if (notifyFailed) {
    const lastSuccessAt = typeof r.lastSuccessAt === 'string' ? Date.parse(r.lastSuccessAt) : NaN;
    if (!(lastSuccessAt >= Date.parse(notify.at))) {
      return {
        ok: false,
        reason: notify.ok ? '台帳からの知らせは届きましたが、写し直しに失敗しました' : `台帳からの知らせが届いていません（${notify.error ?? '理由不明'}）`,
      };
    }
  }
  return { ok: true };
}

/** 担当件数の口の応答を判定する（形は src/shared/staff-workload の parseWorkload と同じ最小限だけ見る） */
export function judgeWorkload(body: unknown): CheckResult {
  const r = body as { roles?: unknown; staff?: unknown } | null;
  if (typeof r !== 'object' || r === null || !Array.isArray(r.roles) || !Array.isArray(r.staff)) {
    return { ok: false, reason: '返ってきた形が違います' };
  }
  return { ok: true };
}

export async function runCheck(check: LinkCheck, notify: NotifyResult | undefined, fetchImpl: typeof fetch = fetch): Promise<CheckResult> {
  let body: unknown;
  try {
    const res = await fetchImpl(check.url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return { ok: false, reason: `${res.status} が返りました` };
    body = await res.json();
  } catch (e) {
    if (e instanceof SyntaxError) return { ok: false, reason: '返ってきた形が違います' };
    return { ok: false, reason: fetchError(e) };
  }
  return check.kind === 'sync' ? judgeSync(body, notify) : judgeWorkload(body);
}

// ---- 記録（台帳の DB） ----

type IncidentRow = {
  id: number;
  app: string;
  check_kind: LinkCheckKind;
  started_at: string;
  ended_at: string | null;
  reason: string;
  last_checked_at: string;
};

function toIncident(row: IncidentRow): LinkIncident {
  return {
    id: row.id,
    app: row.app as WorkloadSourceKey,
    label: labelOf.get(row.app) ?? row.app,
    kind: row.check_kind,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    reason: row.reason,
    lastCheckedAt: row.last_checked_at,
  };
}

/**
 * 1回分の結果を記録する。失敗なら続いている記録を延ばす（理由は最新に）か新しく始め、
 * 成功なら続いている記録を終わらせる。終わった記録はアプリ×見張りごとに直近 KEEP_CLOSED_PER_CHECK 件だけ残す
 */
export function recordCheck(db: Database.Database, check: Pick<LinkCheck, 'app' | 'kind'>, result: CheckResult, at: string): void {
  db.transaction(() => {
    const open = db
      .prepare('SELECT id FROM link_incidents WHERE app = ? AND check_kind = ? AND ended_at IS NULL')
      .get(check.app, check.kind) as { id: number } | undefined;
    if (!result.ok) {
      if (open) {
        db.prepare('UPDATE link_incidents SET reason = ?, last_checked_at = ? WHERE id = ?').run(result.reason, at, open.id);
      } else {
        db.prepare(
          'INSERT INTO link_incidents (app, check_kind, started_at, reason, last_checked_at) VALUES (?, ?, ?, ?, ?)',
        ).run(check.app, check.kind, at, result.reason, at);
      }
      return;
    }
    if (!open) return;
    db.prepare('UPDATE link_incidents SET ended_at = ?, last_checked_at = ? WHERE id = ?').run(at, at, open.id);
    db.prepare(
      `DELETE FROM link_incidents WHERE app = ? AND check_kind = ? AND ended_at IS NOT NULL AND id NOT IN (
         SELECT id FROM link_incidents WHERE app = ? AND check_kind = ? AND ended_at IS NOT NULL ORDER BY id DESC LIMIT ?)`,
    ).run(check.app, check.kind, check.app, check.kind, KEEP_CLOSED_PER_CHECK);
  })();
}

export function listIncidents(db: Database.Database, limit = 100): LinkIncident[] {
  return (db.prepare('SELECT * FROM link_incidents ORDER BY started_at DESC, id DESC LIMIT ?').all(limit) as IncidentRow[]).map(toIncident);
}

export function openIncidents(db: Database.Database): LinkIncident[] {
  return (db.prepare('SELECT * FROM link_incidents WHERE ended_at IS NULL ORDER BY started_at, id').all() as IncidentRow[]).map(toIncident);
}

/** 知らせの結果を残す・読む（notify.ts の onResult / initialResults） */
export function saveNotifyResult(db: Database.Database, r: NotifyResult): void {
  db.prepare(
    `INSERT INTO link_notify_results (app, at, ok, synced, error) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (app) DO UPDATE SET at = excluded.at, ok = excluded.ok, synced = excluded.synced, error = excluded.error`,
  ).run(r.key, r.at, r.ok ? 1 : 0, r.synced === null ? null : r.synced ? 1 : 0, r.error);
}

export function loadNotifyResults(db: Database.Database, targets: { key: LinkedAppKey; label: string; url: string }[]): NotifyResult[] {
  const rows = db.prepare('SELECT * FROM link_notify_results').all() as { app: string; at: string; ok: number; synced: number | null; error: string | null }[];
  return targets.flatMap((t) => {
    const row = rows.find((r) => r.app === t.key);
    return row ? [{ ...t, at: row.at, ok: row.ok === 1, synced: row.synced === null ? null : row.synced === 1, error: row.error }] : [];
  });
}

// ---- 警告の文 ----

/** 「11/12 14:05」（日本時間） */
export function formatJst(at: string): string {
  const d = new Date(Date.parse(at) + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * デスクトップの警告に載せる行。minutes 分以上続いている失敗だけ（一時的な失敗では鳴らさない）。
 * 1件1行で、manage.sh link-check がそのまま last-run の detail へ入れる
 */
export function alertLines(incidents: LinkIncident[], minutes: number, now: number): string[] {
  return incidents
    .filter((i) => i.endedAt === null && now - Date.parse(i.startedAt) >= minutes * 60_000)
    .map(
      (i) =>
        `社員台帳と${i.label}の連携（${LINK_CHECK_KIND_LABEL[i.kind]}）が${formatJst(i.startedAt)}から失敗しています。理由: ${i.reason} 連携の画面: ${LINKS_PAGE_URL}`,
    );
}

// ---- 定期の見張り ----

export type LinkMonitor = {
  /** 全部の口を今すぐ読んで記録する */
  checkAll(): Promise<void>;
  status(): LinksStatus;
  stop(): void;
};

type MonitorOptions = {
  checks?: LinkCheck[];
  notifyResults?: () => NotifyResult[];
  fetchImpl?: typeof fetch;
  intervalMs?: number;
  firstDelayMs?: number;
  /** false ならタイマーを掛けない（テスト用。checkAll は呼べる） */
  schedule?: boolean;
  log?: (message: string) => void;
};

export function createLinkMonitor(
  db: Database.Database,
  {
    checks = buildChecks(),
    notifyResults = () => [],
    fetchImpl = fetch,
    intervalMs = CHECK_INTERVAL_MS,
    firstDelayMs = FIRST_CHECK_DELAY_MS,
    schedule = true,
    log = console.log,
  }: MonitorOptions = {},
): LinkMonitor {
  let checkedAt: string | null = null;
  const lastChecked = new Map<string, string>();
  let running: Promise<void> | null = null;

  async function checkAll(): Promise<void> {
    // 定期の回と /alerts の回が重なったら、走っている方を待つ（同じ口を二重に読まない）
    if (running) return running;
    running = (async () => {
      const notify = notifyResults();
      const results = await Promise.all(checks.map((c) => runCheck(c, notify.find((n) => n.key === c.app), fetchImpl)));
      const at = new Date().toISOString();
      const wasOpen = new Set(openIncidents(db).map((i) => `${i.app}:${i.kind}`));
      checks.forEach((c, i) => {
        const r = results[i];
        recordCheck(db, c, r, at);
        lastChecked.set(`${c.app}:${c.kind}`, at);
        const key = `${c.app}:${c.kind}`;
        if (!r.ok && !wasOpen.has(key)) log(`[links] ${c.label}（${LINK_CHECK_KIND_LABEL[c.kind]}）が失敗しました: ${r.reason}`);
        if (r.ok && wasOpen.has(key)) log(`[links] ${c.label}（${LINK_CHECK_KIND_LABEL[c.kind]}）が直りました`);
      });
      checkedAt = at;
    })().finally(() => {
      running = null;
    });
    return running;
  }

  const safeCheck = () => checkAll().catch((e) => log(`[links] 見張りに失敗しました: ${e instanceof Error ? e.message : String(e)}`));
  let first: ReturnType<typeof setTimeout> | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  if (schedule) {
    first = setTimeout(() => void safeCheck(), firstDelayMs);
    timer = setInterval(() => void safeCheck(), intervalMs);
    first.unref?.();
    timer.unref?.();
  }

  return {
    checkAll,
    status() {
      const open = new Map(openIncidents(db).map((i) => [`${i.app}:${i.kind}`, i]));
      return {
        checkedAt,
        intervalMs,
        checks: checks.map((c): LinkCheckState => {
          const key = `${c.app}:${c.kind}`;
          const inc = open.get(key);
          const last = lastChecked.get(key) ?? inc?.lastCheckedAt ?? null;
          return {
            app: c.app,
            label: c.label,
            kind: c.kind,
            state: inc ? 'failed' : lastChecked.has(key) ? 'ok' : 'unchecked',
            since: inc?.startedAt ?? null,
            reason: inc?.reason ?? null,
            lastCheckedAt: last,
          };
        }),
        incidents: listIncidents(db),
      };
    },
    stop() {
      if (first) clearTimeout(first);
      if (timer) clearInterval(timer);
    },
  };
}
