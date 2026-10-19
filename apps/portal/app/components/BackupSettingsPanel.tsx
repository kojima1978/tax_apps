'use client';

import { useCallback, useEffect, useState } from 'react';
import RestorePanel from '@/components/RestorePanel';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  DatabaseBackup,
  HardDrive,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8765/api';

type LastRun = {
  status: string;
  at: string | null;
  epoch: number | null;
  detail: string;
} | null;

type BackupStatus = {
  settings: {
    automaticEnabled: boolean;
    intervalHours: number;
    dailyRetention: number;
    weeklyRetention: number;
    monthlyRetention: number;
  };
  external: { enabled: boolean; path: string; available: boolean };
  lastBackup: LastRun;
  lastExternalCopy: LastRun;
  lastDrill: LastRun;
  watchdog: LastRun;
  nextDueEpoch: number | null;
  keyPresent: boolean;
  archives: Array<{ name: string; sizeBytes: number; modifiedAt: string }>;
  manualJob: { running: boolean; pid?: number; startedAt?: string };
};

type FormState = BackupStatus['settings'] & { external: BackupStatus['external'] };

const intervals = [
  { value: 12, label: '約12時間ごと' },
  { value: 20, label: '1日1回（推奨）' },
  { value: 44, label: '2日に1回' },
  { value: 68, label: '3日に1回' },
  { value: 164, label: '1週間に1回' },
];

function formatDate(value?: string | null) {
  if (!value) return 'まだ実行されていません';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatEpoch(value: number | null) {
  if (!value) return '自動実行を有効にすると表示されます';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value * 1000));
}

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

function StatusCard({ label, value, detail, good = true, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  good?: boolean;
  icon: typeof CheckCircle2;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 font-semibold text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function BackupSettingsPanel() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStatus = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/status`, { cache: 'no-store' });
      if (!response.ok) throw new Error('状態を取得できませんでした。');
      const nextStatus = await response.json() as BackupStatus;
      setStatus(nextStatus);
      setForm((current) => current ?? { ...nextStatus.settings, external: nextStatus.external });
      setError('');
    } catch {
      setError('バックアップ設定サービスに接続できません。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!status?.manualJob.running) return;
    const timer = window.setInterval(() => { void loadStatus(true); }, 3000);
    return () => window.clearInterval(timer);
  }, [loadStatus, status?.manualJob.running]);

  async function saveSettings() {
    if (!form) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '設定を保存できませんでした。');
      setStatus(result as BackupStatus);
      setForm({ ...(result as BackupStatus).settings, external: (result as BackupStatus).external });
      setNotice('設定を保存しました。次回の自動判定から反映されます。');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '設定を保存できませんでした。');
    } finally {
      setSaving(false);
    }
  }

  async function startBackup() {
    setStarting(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/backup`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'バックアップを開始できませんでした。');
      setNotice('手動バックアップを開始しました。この画面は閉じてもかまいません。');
      await loadStatus(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'バックアップを開始できませんでした。');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-slate-600" role="status">
        <LoaderCircle className="mr-2 size-5 animate-spin" aria-hidden="true" />
        バックアップ状態を確認しています
      </div>
    );
  }

  if (!status || !form) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6" role="alert">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 size-6 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-amber-950">設定サービスを起動してください</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              初回のみ <code className="rounded bg-white/70 px-1.5 py-1">docker\scripts\register-backup-settings-api-task.bat</code> を
              ダブルクリックしてください。設定サービスはこのPC内だけで動作します。
            </p>
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
            >
              <RefreshCw className="size-4" aria-hidden="true" />再接続
            </button>
          </div>
        </div>
      </section>
    );
  }

  const lastOk = status.lastBackup?.status === 'ok';
  const running = status.manualJob.running;

  return (
    <div className="space-y-6">
      <section aria-labelledby="backup-status-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">アプリ全体をまとめて保護</p>
            <h2 id="backup-status-heading" className="mt-1 text-xl font-bold text-slate-950">現在のバックアップ状態</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="size-4" aria-hidden="true" />状態を更新
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            label="最終バックアップ"
            value={formatDate(status.lastBackup?.at)}
            detail={lastOk ? '正常に完了しています' : status.lastBackup ? `結果: ${status.lastBackup.status}` : '最初のバックアップを実行してください'}
            good={lastOk}
            icon={DatabaseBackup}
          />
          <StatusCard
            label="次回の目安"
            value={form.automaticEnabled ? formatEpoch(status.nextDueEpoch) : '自動実行は停止中'}
            detail="PC起動中の4時間ごとの確認時に実行"
            good={form.automaticEnabled}
            icon={Clock3}
          />
          <StatusCard
            label="暗号鍵"
            value={status.keyPresent ? '利用できます' : '見つかりません'}
            detail="鍵の控えはバックアップと別の場所に保管してください"
            good={status.keyPresent}
            icon={KeyRound}
          />
          <StatusCard
            label="復元テスト"
            value={formatDate(status.lastDrill?.at)}
            detail={status.lastDrill?.status === 'ok' ? '実際に復元できることを確認済み' : '復元テストの状態を確認してください'}
            good={status.lastDrill?.status === 'ok'}
            icon={ShieldCheck}
          />
        </div>
      </section>

      {(error || notice || running) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : running ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <span>{error || (running ? '手動バックアップを実行中です。完了すると最終バックアップの日時が更新されます。' : notice)}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="automatic-settings-heading">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 id="automatic-settings-heading" className="text-lg font-bold text-slate-950">自動バックアップ</h2>
            <p className="mt-1 text-sm text-slate-600">保存頻度と世代数を設定します。</p>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <span>
                <span className="block font-semibold text-slate-900">自動バックアップを有効にする</span>
                <span className="mt-0.5 block text-xs text-slate-500">無効にしても既存のバックアップは削除されません</span>
              </span>
              <input
                type="checkbox"
                checked={form.automaticEnabled}
                onChange={(event) => setForm({ ...form, automaticEnabled: event.target.checked })}
                className="size-5 accent-emerald-700"
              />
            </label>

            <div>
              <label htmlFor="backup-interval" className="text-sm font-semibold text-slate-800">保存頻度</label>
              <select
                id="backup-interval"
                value={form.intervalHours}
                disabled={!form.automaticEnabled}
                onChange={(event) => setForm({ ...form, intervalHours: Number(event.target.value) })}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {intervals.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">PCが停止中だった場合は、次回起動後の確認時に実行します。</p>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">保存する世代数</legend>
              <p className="mt-1 text-xs leading-5 text-slate-500">古い世代は自動整理されます。週次・月次は日次から代表を残すため、容量を抑えられます。</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  ['dailyRetention', '日次', 1, 30, '日'],
                  ['weeklyRetention', '週次', 0, 12, '週'],
                  ['monthlyRetention', '月次', 0, 24, 'か月'],
                ].map(([key, label, min, max, unit]) => (
                  <label key={String(key)} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="block font-medium">{label}</span>
                    <span className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={Number(min)}
                        max={Number(max)}
                        value={form[key as keyof BackupStatus['settings']] as number}
                        onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })}
                        className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-right text-slate-900"
                      />
                      {unit}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">別のドライブにもコピー</legend>
              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.external.enabled}
                  onChange={(event) => setForm({ ...form, external: { ...form.external, enabled: event.target.checked } })}
                  className="size-5 accent-emerald-700"
                />
                <span className="text-sm text-slate-700">USB・外付けディスク・NASへ最新分をコピーする</span>
              </label>
              <label htmlFor="external-path" className="mt-3 block text-sm font-medium text-slate-700">コピー先フォルダ</label>
              <input
                id="external-path"
                type="text"
                value={form.external.path}
                disabled={!form.external.enabled}
                onChange={(event) => setForm({ ...form, external: { ...form.external, path: event.target.value } })}
                placeholder="E:\tax-apps-backup または \\NAS\backup"
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100"
              />
              {form.external.enabled && !status.external.available && form.external.path === status.external.path ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  コピー先は現在未接続です。設定はそのまま保存でき、接続後のバックアップからコピーされます。
                </p>
              ) : null}
            </fieldset>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => status && setForm({ ...status.settings, external: status.external })}
                disabled={saving}
                className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                変更を戻す
              </button>
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                設定を保存
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm" aria-labelledby="manual-backup-heading">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                <DatabaseBackup className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="manual-backup-heading" className="font-bold text-emerald-950">今すぐバックアップ</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900">設定に関係なく、全アプリのデータを暗号化して保存します。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void startBackup()}
              disabled={starting || running}
              className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting || running ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <DatabaseBackup className="size-4" aria-hidden="true" />}
              {running ? 'バックアップ実行中' : '今すぐ実行'}
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="backup-history-heading">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="backup-history-heading" className="font-bold text-slate-950">最近のバックアップ</h2>
            </div>
            {status.archives.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">保存済みのバックアップはありません。</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {status.archives.map((archive) => (
                  <li key={archive.name} className="flex items-center gap-3 px-5 py-3">
                    <HardDrive className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{archive.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(archive.modifiedAt)}</p>
                    </div>
                    <span className="text-xs tabular-nums text-slate-500">{formatBytes(archive.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <RestorePanel />
      <p className="text-xs leading-5 text-slate-500">
        バックアップには各データベース、アップロード、テンプレート、アプリ設定が含まれます。暗号鍵そのものは安全のためバックアップに含まれません。
      </p>
    </div>
  );
}
