import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  LINKED_APPS,
  READING_APPS,
  TRIGGER_LABEL,
  fetchNotifyStatus,
  fetchSyncState,
  relativeTime,
  type LinkedApp,
  type NotifyResult,
  type NotifyStatus,
  type SyncRun,
  type SyncState,
} from '../linkedApps';
import { PageHeader, btn } from '../components/ui';
import { fetchWorkloads, type AppWorkload } from '../workload';
import { LinkTroubleNote } from '../components/LinkTroubleNote';
import { LINK_CHECK_KIND_LABEL, failingSince, useLinkHealth, type LinkHealth } from '../linkHealth';
import { WORKLOAD_SOURCES } from '../../server/linkedApps';

// 台帳の変更が各アプリへ届いているかを、台帳の側から見る画面。
// 写しを持つアプリはその写しの状況を、直接読むアプリは一覧だけを出す

const NOW_TICK_MS = 30_000;

// 「3分前」を古くしないための再描画と、状況の読み直しの合図（GET は記録を読むだけなので軽い）。
// 時刻そのものは描画のたびに取る（読み直した直後の描画で、最大30秒前の時刻と比べてしまわないように）
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

/** 失敗中の「〇分前から古い」 */
function staleText(lastSuccessAt: string): string {
  const rel = relativeTime(lastSuccessAt, Date.now());
  return rel === 'たった今' ? '直前に写せた内容のまま動いています。' : `アプリの担当者・部署は${rel}から古いままです。`;
}

function When({ at }: { at: string }) {
  return (
    <>
      <span className="font-medium">{relativeTime(at, Date.now())}</span>
      <span className="ml-2 text-xs text-slate-500">{new Date(at).toLocaleString('ja-JP')}</span>
    </>
  );
}

// 台帳のサーバが保存のたびに送った知らせの結果
function NoticeLine({ notify, result }: { notify: NotifyStatus | null; result: NotifyResult | undefined }) {
  let body: ReactNode;
  if (notify === null) body = <span className="text-slate-500">確かめられません</span>;
  else if (!notify.enabled) body = <span className="text-slate-500">送らない設定です（LINKED_APP_ORIGINS）</span>;
  else if (!result) body = <span className="text-slate-500">{notify.pending ? '送る準備をしています…' : 'まだ知らせたことがありません'}</span>;
  else
    body = (
      <>
        <When at={result.at} />
        <span className={`ml-3 ${result.ok && result.synced !== false ? 'text-slate-600' : 'text-red-700'}`}>
          {!result.ok
            ? `届きませんでした（${result.error ?? '理由不明'}）`
            : result.synced === false
              ? '届きましたが、写し直しは失敗しました'
              : '届いて写し直しました'}
        </span>
        {notify.pending && <span className="ml-2 text-xs text-slate-500">（次の知らせを送っています…）</span>}
      </>
    );
  return (
    <p>
      <span className="text-slate-500">台帳からの知らせ：</span>
      {body}
    </p>
  );
}

function HistoryList({ history }: { history: SyncRun[] }) {
  if (history.length <= 1) return null;
  return (
    <details className="text-xs text-slate-600">
      <summary className="cursor-pointer select-none text-slate-500">直近の記録（{history.length}回）</summary>
      <ul className="mt-1 space-y-0.5">
        {history.map((h) => (
          <li key={h.at} className="flex flex-wrap gap-x-3">
            <span className="tabular-nums">{new Date(h.at).toLocaleString('ja-JP')}</span>
            <span className="w-28">{TRIGGER_LABEL[h.trigger]}</span>
            {h.ok ? (
              <span>
                成功（追加 {h.created}件・更新 {h.updated}件）
              </span>
            ) : (
              <span className="text-red-700">失敗：{h.error ?? '理由不明'}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function SyncCard({ app, tick, notify }: { app: LinkedApp; tick: number; notify: NotifyStatus | null }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (force: boolean) => {
    if (force) setBusy(true);
    setState(await fetchSyncState(app, force));
    if (force) setBusy(false);
  }, [app]);

  // 開いたときと、そのあと30秒ごとに読み直す（台帳で保存した結果がこの画面にも出るように）
  useEffect(() => {
    void load(false);
  }, [load, tick]);

  const badge = BADGE[badgeOf(state)];
  const status = typeof state === 'object' ? state : null;
  const result = notify?.results.find((r) => r.key === app.key);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="text-base font-bold text-slate-800">{app.label}</h4>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badge.className}`}>{badge.label}</span>
        <div className="ml-auto flex items-center gap-3">
          <a href={app.page} target="_blank" rel="noopener" className="text-sm text-teal-700 hover:underline">
            担当者の画面 ↗
          </a>
          <button type="button" className={btn.secondary} disabled={busy} onClick={() => void load(true)}>
            {busy ? '読み直しています…' : '今すぐ読み直す'}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {state === 'unreachable' && (
          <p className="text-amber-800">アプリが止まっているか応答しないため、写しの状況を確かめられません。</p>
        )}
        {state === 'never' && <p className="text-slate-600">まだ一度も台帳を読んでいません。「今すぐ読み直す」で読ませられます。</p>}
        {status && (
          <>
            <p>
              <span className="text-slate-500">最後に写せた時刻：</span>
              {status.lastSuccessAt ? <When at={status.lastSuccessAt} /> : <span className="font-medium text-red-700">まだ一度も写せていません</span>}
            </p>
            <p>
              <span className="text-slate-500">最後に試した時刻：</span>
              <When at={status.at} />
              <span className="ml-3 text-slate-600">
                {TRIGGER_LABEL[status.trigger]}・{status.ok ? `追加 ${status.created}件・更新 ${status.updated}件` : '失敗'}
              </span>
            </p>
            {!status.ok && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                写せませんでした：{status.error ?? '理由は返ってきませんでした'}。
                {status.lastSuccessAt
                  ? staleText(status.lastSuccessAt)
                  : 'アプリには台帳の内容がまだ写っていません。'}
              </p>
            )}
          </>
        )}
        <NoticeLine notify={notify} result={result} />
        {status && (
          <>
            <HistoryList history={status.history} />
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

// 社員一覧の「担当」列・退職者の担当の元になる、各アプリの担当件数が読めているか
function WorkloadSection({ tick, health }: { tick: number; health: LinkHealth | null | undefined }) {
  const [apps, setApps] = useState<AppWorkload[] | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchWorkloads().then((a) => alive && setApps(a));
    return () => {
      alive = false;
    };
  }, [tick]);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-slate-800">担当件数を読むアプリ</h3>
        <p className="mt-1 text-sm text-slate-600">
          社員一覧の「担当」列と「退職者の担当あり」は、ここに並ぶアプリから人ごとの件数だけを読んで数えています（名前や顧客は受け取りません）。
          読めないアプリは一覧で「—」になり、その分は担当の数に入りません。
        </p>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {(apps ?? []).map(({ source, data }) => (
          <li key={source.key} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-2 text-sm">
            <span className="w-40 shrink-0 font-medium text-slate-800">{source.label}</span>
            {data === 'unreachable' ? (
              <>
                <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${BADGE.unreachable.className}`}>読めない（—）</span>
                <FailingSince since={failingSince(health, source.key, 'workload')} />
              </>
            ) : (
              <>
                <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${BADGE.ok.className}`}>読めた</span>
                <span className="text-slate-600">
                  {data.roles.map((r) => r.label).join('・')}／{data.staff.length}人分／進行中の数え方: {data.activeLabel}
                </span>
              </>
            )}
          </li>
        ))}
        {apps === null && <li className="px-4 py-2 text-sm text-slate-500">確認中…</li>}
      </ul>
    </section>
  );
}

function FailingSince({ since }: { since: string | null }) {
  if (!since) return null;
  return (
    <span className="text-xs text-amber-800">
      {relativeTime(since, Date.now())}から（{new Date(since).toLocaleString('ja-JP')}〜）
    </span>
  );
}

const fmt = (at: string) => new Date(at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** 「〇時間〇分」 */
function duration(from: string, to: number): string {
  const min = Math.max(0, Math.round((to - Date.parse(from)) / 60_000));
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}時間${min % 60 ? `${min % 60}分` : ''}` : `${Math.floor(h / 24)}日${h % 24 ? `${h % 24}時間` : ''}`;
}

// 台帳のサーバが5分ごとに確かめた、失敗の始まりと終わり（台帳の DB に残る）
function IncidentSection({ health }: { health: LinkHealth | null | undefined }) {
  const incidents = health?.incidents ?? [];
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-slate-800">失敗の記録</h3>
        <p className="mt-1 text-sm text-slate-600">
          台帳のサーバが5分ごとに、写しの状況と担当件数の口を確かめています。失敗が始まった時刻と直った時刻を、アプリごとに直近20件まで残します（台帳を作り直しても消えません）。
          30分以上続いている失敗は、デスクトップの警告（TAX-APPS-ALERT.txt）にも出ます。
        </p>
        {health?.checkedAt && <p className="mt-1 text-xs text-slate-500">最後に確かめた時刻: {new Date(health.checkedAt).toLocaleString('ja-JP')}</p>}
      </div>
      {health === null ? (
        <p className="text-sm text-amber-800">記録を読めませんでした。</p>
      ) : incidents.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">{health === undefined ? '確認中…' : '失敗の記録はありません。'}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">アプリ</th>
                <th className="px-3 py-1.5 font-medium">連携</th>
                <th className="px-3 py-1.5 font-medium">始まり</th>
                <th className="px-3 py-1.5 font-medium">終わり</th>
                <th className="px-3 py-1.5 font-medium">理由（最後に見たもの）</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.map((i) => (
                <tr key={i.id} className={i.endedAt === null ? 'bg-red-50/60' : undefined}>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-800">{i.label}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{LINK_CHECK_KIND_LABEL[i.kind]}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{fmt(i.startedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">
                    {i.endedAt === null ? (
                      <span className="font-medium text-red-700">続いている（{duration(i.startedAt, Date.now())}）</span>
                    ) : (
                      <>
                        {fmt(i.endedAt)}
                        <span className="ml-1 text-xs text-slate-500">（{duration(i.startedAt, Date.parse(i.endedAt))}）</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{i.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function LinksPage() {
  const tick = useTick();
  const health = useLinkHealth(tick);
  const failingWorkload = WORKLOAD_SOURCES.filter((s) => failingSince(health, s.key, 'workload') !== null);
  const [notify, setNotify] = useState<NotifyStatus | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchNotifyStatus().then((n) => alive && setNotify(n));
    return () => {
      alive = false;
    };
  }, [tick]);

  return (
    <div className="space-y-6">
      <PageHeader title="連携" description="台帳の変更が各アプリへ届いているか、各アプリの担当件数を読めているかを、台帳の側から確かめる画面です。" />
      <LinkTroubleNote
        onLinksPage
        health={health ?? null}
        unreachable={failingWorkload}
        consequence="社員一覧の担当件数はそのアプリの分が入らず、部署・会社の担当の合計は「—」になります。"
      />
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">写しを持つアプリ</h3>
          <p className="mt-1 text-sm text-slate-600">
            担当者・部署を自分の DB へ写して使うアプリです。台帳で保存すると、数秒のうちに台帳から知らせて写し直させます。
            知らせが届かなかったときは、そのアプリで担当者の一覧が開かれたとき（前回から5分以上たっていれば）に追いつきます。
          </p>
        </div>
        {LINKED_APPS.map((app) => (
          <SyncCard key={app.key} app={app} tick={tick} notify={notify} />
        ))}
        <p className="text-xs text-slate-500">
          写しの記録は各アプリの DB に直近20回分あり、作り直しても残ります。台帳からの知らせの最後の結果は台帳の DB に残ります。
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">台帳を直接読むアプリ</h3>
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

      <WorkloadSection tick={tick} health={health} />

      <IncidentSection health={health} />
    </div>
  );
}
