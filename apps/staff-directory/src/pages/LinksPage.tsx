import { useCallback, useEffect, useState } from 'react';
import { LINKED_APPS, READING_APPS, fetchSyncState, relativeTime, type LinkedApp, type SyncState } from '../linkedApps';
import { btn } from '../components/ui';

// 台帳の変更が各アプリへ届いているかを、台帳の側から見る画面。
// 写しを持つアプリはその写しの状況を、直接読むアプリは一覧だけを出す

const NOW_TICK_MS = 30_000;

// 「3分前」を古くしないための再描画の合図。時刻そのものは描画のたびに取る
// （読み直した直後の描画で、最大30秒前の時刻と比べてしまわないように）
function useTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

const BADGE = {
  ok: { label: '正常', className: 'bg-teal-50 text-teal-700 ring-teal-200' },
  failed: { label: '失敗', className: 'bg-red-50 text-red-700 ring-red-200' },
  never: { label: '未実行', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  unreachable: { label: '確かめられない', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  loading: { label: '確認中…', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
} as const;

function badgeOf(state: SyncState | null): keyof typeof BADGE {
  if (state === null) return 'loading';
  if (typeof state === 'string') return state;
  return state.ok ? 'ok' : 'failed';
}

function SyncCard({ app }: { app: LinkedApp; tick: number }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (force: boolean) => {
    setBusy(true);
    setState(await fetchSyncState(app, force));
    setBusy(false);
  }, [app]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const badge = BADGE[badgeOf(state)];
  const status = typeof state === 'object' ? state : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-base font-bold text-slate-800">{app.label}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badge.className}`}>{badge.label}</span>
        <div className="ml-auto flex items-center gap-3">
          <a href={app.page} target="_blank" rel="noopener" className="text-sm text-teal-700 hover:underline">
            担当者の画面 ↗
          </a>
          <button type="button" className={btn.secondary} disabled={busy} onClick={() => void load(true)}>
            {busy && state !== null ? '読み直しています…' : '今すぐ読み直す'}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {state === 'unreachable' && (
          <p className="text-amber-800">アプリが止まっているか応答しないため、写しの状況を確かめられません。</p>
        )}
        {state === 'never' && <p className="text-slate-600">アプリが起動してから、まだ一度も台帳を読んでいません。「今すぐ読み直す」で読ませられます。</p>}
        {status && (
          <>
            <p>
              <span className="text-slate-500">{status.ok ? '最後に写した時刻' : '最後に試した時刻'}：</span>
              <span className="font-medium">{relativeTime(status.at, Date.now())}</span>
              <span className="ml-2 text-xs text-slate-500">{new Date(status.at).toLocaleString('ja-JP')}</span>
              {status.ok && (
                <span className="ml-3 text-slate-600">
                  追加 {status.created}件・更新 {status.updated}件
                </span>
              )}
            </p>
            {!status.ok && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                写せませんでした：{status.error ?? '理由は返ってきませんでした'}。アプリは前回までの写しのまま動いています。
              </p>
            )}
            {status.unlinked.length > 0 ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                <p className="font-medium">台帳と結び付いていない担当者が {status.unlinked.length}名います（台帳の変更が反映されません）</p>
                <p className="mt-1 break-words">{status.unlinked.map((u) => u.name || `ID ${u.id}`).join('、')}</p>
                <p className="mt-1 text-xs">{app.unlinkedFix}</p>
              </div>
            ) : (
              <p className="text-slate-600">台帳と結び付いていない担当者はいません。</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function LinksPage() {
  const tick = useTick();
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">写しを持つアプリ</h2>
          <p className="mt-1 text-sm text-slate-600">
            担当者・部署を自分の DB へ写して使うアプリです。台帳の変更は、そのアプリの担当者の一覧かこの画面が開かれたとき（前回から5分以上たっていれば）に写ります。
          </p>
        </div>
        {LINKED_APPS.map((app) => (
          <SyncCard key={app.syncUrl} app={app} tick={tick} />
        ))}
        <p className="text-xs text-slate-500">
          写しの状況は各アプリのメモリにだけあり、アプリを作り直すと「未実行」に戻ります。
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">台帳を直接読むアプリ</h2>
          <p className="mt-1 text-sm text-slate-600">写しは持ちません。台帳の変更は、次に画面を開いたときにすぐ見えます。</p>
        </div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {READING_APPS.map((app) => (
            <li key={app.url} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-2 text-sm">
              <a href={app.url} target="_blank" rel="noopener" className="w-40 shrink-0 font-medium text-teal-700 hover:underline">
                {app.label}
              </a>
              <span className="text-slate-600">{app.uses}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
