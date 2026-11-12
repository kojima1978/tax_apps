import { useCallback, useEffect, useState } from 'react';
import { LINK_CHECK_KIND_LABEL, type LinkCheckKind, type WorkloadSourceKey } from '../server/linkedApps';

// 台帳のサーバが5分ごとに確かめている連携の状態（server/linkHealth.ts の GET /api/link-health）。
// 画面の注記の「〇分前から」と、連携の画面の「失敗の記録」がここを読む

export { LINK_CHECK_KIND_LABEL };

export type LinkCheckState = {
  app: WorkloadSourceKey;
  label: string;
  kind: LinkCheckKind;
  state: 'ok' | 'failed' | 'unchecked';
  since: string | null;
  reason: string | null;
  lastCheckedAt: string | null;
};

export type LinkIncident = {
  id: number;
  app: WorkloadSourceKey;
  label: string;
  kind: LinkCheckKind;
  startedAt: string;
  endedAt: string | null;
  reason: string;
  lastCheckedAt: string;
};

export type LinkHealth = {
  checkedAt: string | null;
  intervalMs: number;
  checks: LinkCheckState[];
  incidents: LinkIncident[];
};

/** 読めなければ null（台帳のサーバが古い・止まっている。注記は「いつから」を省くだけ） */
export async function fetchLinkHealth(): Promise<LinkHealth | null> {
  try {
    const res = await fetch('/staff-directory/api/link-health', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    return res.ok ? ((await res.json()) as LinkHealth) : null;
  } catch {
    return null;
  }
}

/** tick が変わるたびに読み直す（連携の画面の30秒ごと）。読み込み中は undefined */
export function useLinkHealth(tick = 0): LinkHealth | null | undefined {
  const [health, setHealth] = useState<LinkHealth | null | undefined>(undefined);
  const load = useCallback(() => fetchLinkHealth(), []);
  useEffect(() => {
    let alive = true;
    void load().then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, [load, tick]);
  return health;
}

/** そのアプリ・見張りの失敗が続いていれば、始まった時刻 */
export function failingSince(health: LinkHealth | null | undefined, app: string, kind: LinkCheckKind): string | null {
  const c = health?.checks.find((x) => x.app === app && x.kind === kind);
  return c?.state === 'failed' ? c.since : null;
}
