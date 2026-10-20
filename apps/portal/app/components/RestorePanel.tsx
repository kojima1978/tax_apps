'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react';

const API = 'http://127.0.0.1:8765/api/restore';
type Catalog = { sources: { id: string; label: string; available: boolean; archives: { name: string; sizeBytes: number }[] }[]; targets: string[] };
type Job = { id: string; mode: string; status: string; target: string; archive: string; sourceId: string; log: string };
const labels: Record<string, string> = {
  local: 'このPCのバックアップ', latest: '最新分の控え', external: '設定済みの外部コピー先',
  'inheritance-case-management': '案件管理', 'bank-analyzer': '預貯金分析',
  'private-banking': '資産・負債管理（PB）', 'stock-valuation-form': '株式評価明細書',
  'insurance-app': '保険管理', 'inheritance-tax-docs': '相続税 必要書類',
  'staff-directory': '社員台帳',
};
const fieldClass = 'mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100';

export default function RestorePanel() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [sourceId, setSource] = useState('local');
  const [archive, setArchive] = useState('');
  const [target, setTarget] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [lastResult, setLastResult] = useState('');

  const refreshJob = useCallback(async () => {
    const response = await fetch(`${API}/job`, { cache: 'no-store' });
    if (!response.ok) throw new Error('復元状態を取得できませんでした。');
    const data = await response.json();
    setJob(data.job);
    if (data.lastRestore) setLastResult(`${data.lastRestore.at} / ${data.lastRestore.status === 'ok' ? '正常終了' : data.lastRestore.status}`);
  }, []);

  async function refresh() {
    setError('');
    try {
      const response = await fetch(`${API}/catalog`, { cache: 'no-store' });
      if (!response.ok) throw new Error('バックアップ一覧を取得できませんでした。');
      setCatalog(await response.json());
      await refreshJob();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '設定サービスに接続できません。'); }
  }

  useEffect(() => { void refresh(); /* Initial catalog and active operation. */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (job?.status !== 'running') return;
    const timer = window.setInterval(() => { void refreshJob().catch(() => setError('状態を取得できません。再読み込みしてください。')); }, 2000);
    return () => window.clearInterval(timer);
  }, [job?.status, refreshJob]);

  const running = job?.status === 'running';
  const previewReady = job?.mode === 'preview' && job.status === 'ok' && job.sourceId === sourceId && job.archive === archive && job.target === target;
  const source = catalog?.sources.find((item) => item.id === sourceId);

  async function start(mode: 'preview' | 'execute') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API}/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, archive, target, previewId: job?.id, confirmation: mode === 'execute' && confirmed ? 'RESTORE' : '' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '復元処理を開始できませんでした。');
      setConfirmed(false);
      await refreshJob();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '復元処理を開始できませんでした。'); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="restore-heading">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 id="restore-heading" className="flex items-center gap-2 text-lg font-bold text-slate-950"><RotateCcw className="size-5" aria-hidden="true" />バックアップから復元</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">戻したい時点とアプリを選び、内容を確認してから復元します。</p>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-800">保存場所
            <select className={fieldClass} value={sourceId} disabled={busy || running} onChange={(event) => { setSource(event.target.value); setArchive(''); setConfirmed(false); }}>
              {catalog?.sources.map((item) => <option key={item.id} value={item.id}>{labels[item.id] || item.label}{item.available ? '' : '（未接続）'}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-semibold text-slate-800">戻すバックアップ
            <select className={fieldClass} value={archive} disabled={busy || running} onChange={(event) => { setArchive(event.target.value); setConfirmed(false); }}>
              <option value="">バックアップを選択</option>
              {source?.archives.map((item) => <option key={item.name} value={item.name}>{item.name.startsWith('pre-restore_') ? '復元前の退避: ' : ''}{item.name.replace('pre-restore_', '').replace('.tar.gz.enc', '')}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">復元するアプリ
            <select className={fieldClass} value={target} disabled={busy || running} onChange={(event) => { setTarget(event.target.value); setConfirmed(false); }}>
              <option value="">アプリを選択</option>
              {catalog?.targets.map((id) => <option key={id} value={id}>{labels[id] || id}</option>)}
              <option value="--all">データを持つ全アプリ</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || running || !archive || !target} onClick={() => void start('preview')} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
            {busy || running ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}復元内容を確認
          </button>
          <button type="button" disabled={busy || running} onClick={() => void refresh()} className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">一覧・状態を更新</button>
        </div>
        <p className="text-xs leading-5 text-slate-500">確認時に暗号鍵とバックアップの整合性を検証し、バックアップと現在の件数を表示します。ブラウザ内だけに保存した入力は対象外です。</p>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {job ? (
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm font-semibold text-slate-800">{job.mode === 'preview' ? '内容確認' : '復元'}: {running ? '実行中（画面を閉じても処理は続きます）' : job.status === 'ok' ? '正常終了' : '失敗しました。下の結果を確認してください。'}</p>
            <p className="break-all text-xs text-slate-600">{labels[job.target] || (job.target === '--all' ? '全アプリ' : job.target)} / {job.archive}</p>
            <pre tabIndex={0} aria-label="復元処理の詳細結果" className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{job.log || '開始しています…'}</pre>
          </div>
        ) : null}
        {previewReady ? (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-sm leading-6 text-amber-950"><AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" />選択したアプリの現在のデータを、このバックアップの内容で置き換えます。復元直前のデータは自動退避され、対象アプリは処理中に一時停止します。</p>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-amber-950"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="size-5 accent-amber-800" />件数と対象を確認し、現在のデータを上書きすることを了承しました</label>
            <button type="button" disabled={!confirmed || busy} onClick={() => void start('execute')} className="min-h-11 cursor-pointer rounded-lg bg-amber-800 px-5 py-2 text-sm font-bold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50">選択したバックアップから復元する</button>
            <p className="text-xs text-amber-900">確認結果は15分間有効です。現在の接続設定は保持されます。</p>
          </div>
        ) : null}
        {lastResult ? <p className="text-xs text-slate-500">前回の復元: {lastResult}</p> : null}
      </div>
    </section>
  );
}
