// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
//
// 社員台帳の写しを持つアプリ（PB・案件管理）が、担当者を選ぶ欄に「写しが古いかもしれない」と出すための読み取り。
// 判定は台帳のサーバ（apps/staff-directory/server/linkHealth.ts）が5分おきに確かめた結果だけで、ここでは何も判定しない。
// 台帳が止まっていて読めないときは何も出さない（台帳が落ちていることは別の口が知らせる）。
import { useEffect, useState } from 'react';

const LINK_HEALTH_URL = '/staff-directory/api/link-health';
const TIMEOUT_MS = 3000;

/** 写しの連携が失敗しているときの中身（いつから・理由） */
export type CopyLinkTrouble = { since: string; reason: string };

/** link-health の応答から、そのアプリの写し（kind: sync）の失敗だけを取り出す。読めない形・失敗していなければ null */
export function copyLinkTrouble(body: unknown, app: string): CopyLinkTrouble | null {
  if (typeof body !== 'object' || body === null) return null;
  const checks = (body as { checks?: unknown }).checks;
  if (!Array.isArray(checks)) return null;
  for (const check of checks) {
    if (typeof check !== 'object' || check === null) continue;
    const c = check as Record<string, unknown>;
    if (c.app !== app || c.kind !== 'sync' || c.state !== 'failed') continue;
    return {
      since: typeof c.since === 'string' ? c.since : '',
      reason: typeof c.reason === 'string' ? c.reason : '',
    };
  }
  return null;
}

/** 選ぶ欄の下に出す1文。時刻は日本時間の「11/12 19:43」 */
export function copyLinkTroubleMessage(trouble: CopyLinkTrouble): string {
  const since = Number.isNaN(Date.parse(trouble.since))
    ? ''
    : new Date(trouble.since).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `社員台帳からの写しが${since ? `${since}から` : ''}更新できていません${trouble.reason ? `（${trouble.reason}）` : ''}。` +
    '入社・退職・異動が一覧に反映されていないことがあります。';
}

/** 画面を開いたときに1回だけ読む。台帳に届かなければ null のまま */
export function useCopyLinkTrouble(app: string): CopyLinkTrouble | null {
  const [trouble, setTrouble] = useState<CopyLinkTrouble | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(LINK_HEALTH_URL, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!response.ok) return;
        const found = copyLinkTrouble(await response.json(), app);
        if (!cancelled) setTrouble(found);
      } catch {
        // 台帳が止まっているときは何も出さない
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [app]);
  return trouble;
}
