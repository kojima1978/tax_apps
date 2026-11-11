import { LINKED_APP_TARGETS, type LinkedAppKey, type LinkedAppTarget } from './linkedApps.js';

// 台帳を保存したら、写しを持つアプリ（案件管理・PB）へ「今すぐ写し直して」と知らせる。
// - 保存の応答は待たせない（保存のあとに非同期で送る）
// - 続けて保存したときはまとめて1回にする（最初の保存から DEBOUNCE_MS 待って送る。送っている間に
//   来た保存は、送り終わってからもう1回送る ── 送る前の台帳を読まれていたかもしれないので）
// - 相手が止まっていても台帳の保存は成功のまま。失敗は記録だけして、相手側の5分ごとの写し直しに任せる
// 送り先は LINKED_APP_ORIGINS で変えられる（parseOrigins）

const DEBOUNCE_MS = 1500;
// 相手は台帳を読み直して DB へ写してから応答する（台帳への問い合わせは最大3秒）。人は待っていないので長めに
const TIMEOUT_MS = 15_000;

export type NotifyTarget = { key: LinkedAppKey; label: string; url: string };

export type NotifyResult = NotifyTarget & {
  at: string;
  ok: boolean;
  /** 相手の写しの結果（応答の ok）。相手は受け取ったが台帳を読めなかった、を分けて出すため */
  synced: boolean | null;
  error: string | null;
};

export type NotifierStatus = {
  enabled: boolean;
  targets: NotifyTarget[];
  /** 知らせを待っている保存があるか（まとめ待ち・送信中） */
  pending: boolean;
  /** 最後に保存があった時刻（起動してから） */
  lastChangeAt: string | null;
  /** 送り先ごとの最後の結果 */
  results: NotifyResult[];
};

/**
 * LINKED_APP_ORIGINS を読む。未設定なら既定（コンテナ名）。
 * `off` で全部止める。`itcm=http://host:3020,private-banking=off` のように送り先ごとに差し替え・停止できる
 * （書かなかったアプリは既定のまま）。形が違う指定は例外（起動時に気づけるように）
 */
export function resolveTargets(raw: string | undefined, apps: LinkedAppTarget[] = LINKED_APP_TARGETS): NotifyTarget[] {
  const value = (raw ?? '').trim();
  if (value === 'off') return [];
  const origins = new Map<string, string>(apps.map((a) => [a.key, a.defaultOrigin]));
  if (value !== '') {
    for (const part of value.split(',')) {
      const m = /^\s*([\w-]+)\s*=\s*(\S+)\s*$/.exec(part);
      if (!m || !origins.has(m[1])) throw new Error(`LINKED_APP_ORIGINS の指定が読めません: ${part.trim()}`);
      if (m[2] !== 'off' && !/^https?:\/\//.test(m[2])) throw new Error(`LINKED_APP_ORIGINS の送り先は http(s):// で始めてください: ${part.trim()}`);
      origins.set(m[1], m[2]);
    }
  }
  return apps.flatMap((a) => {
    const origin = origins.get(a.key)!;
    return origin === 'off' ? [] : [{ key: a.key, label: a.label, url: `${origin.replace(/\/+$/, '')}${a.basePath}${a.syncPath}` }];
  });
}

type Options = {
  targets: NotifyTarget[];
  fetchImpl?: typeof fetch;
  debounceMs?: number;
  timeoutMs?: number;
  log?: (message: string) => void;
};

export type Notifier = {
  /** 保存のたびに呼ぶ。すぐ戻る */
  notify(): void;
  status(): NotifierStatus;
  /** 待っている知らせを送り終えるまで待つ（テスト用） */
  idle(): Promise<void>;
};

async function send(target: NotifyTarget, fetchImpl: typeof fetch, timeoutMs: number): Promise<NotifyResult> {
  const at = new Date().toISOString();
  try {
    const res = await fetchImpl(target.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'directory' }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ...target, at, ok: false, synced: null, error: `${res.status} が返りました` };
    const body = (await res.json().catch(() => null)) as { ok?: unknown } | null;
    const synced = typeof body?.ok === 'boolean' ? body.ok : null;
    return { ...target, at, ok: true, synced, error: null };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    return { ...target, at, ok: false, synced: null, error: timedOut ? `${timeoutMs / 1000} 秒以内に応答しませんでした` : '接続できませんでした（止まっているかもしれません）' };
  }
}

export function createNotifier({ targets, fetchImpl = fetch, debounceMs = DEBOUNCE_MS, timeoutMs = TIMEOUT_MS, log = console.log }: Options): Notifier {
  const results = new Map<LinkedAppKey, NotifyResult>();
  let lastChangeAt: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sending: Promise<void> | null = null;
  let dirty = false;

  function schedule() {
    if (timer || sending) return;
    timer = setTimeout(() => {
      timer = null;
      dirty = false;
      sending = (async () => {
        for (const r of await Promise.all(targets.map((t) => send(t, fetchImpl, timeoutMs)))) {
          results.set(r.key, r);
          if (!r.ok) log(`[notify] ${r.label} へ知らせられませんでした: ${r.error}`);
        }
      })().finally(() => {
        sending = null;
        if (dirty) schedule();
      });
    }, debounceMs);
  }

  return {
    notify() {
      lastChangeAt = new Date().toISOString();
      if (targets.length === 0) return;
      dirty = true;
      schedule();
    },
    status() {
      return {
        enabled: targets.length > 0,
        targets,
        pending: timer !== null || sending !== null,
        lastChangeAt,
        results: targets.flatMap((t) => results.get(t.key) ?? []),
      };
    },
    async idle() {
      while (timer || sending) {
        await (sending ?? new Promise((resolve) => setTimeout(resolve, debounceMs + 1)));
      }
    },
  };
}
