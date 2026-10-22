import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock3, RotateCcw, ShieldCheck } from 'lucide-react';
import { operatorRequestHeaders, useOperator } from '@/shared/staff-directory/operator';

type AuditAction = 'create' | 'update' | 'delete' | 'reorder' | 'publish' | 'restore';
type AuditTargetType = 'document_master' | 'resource';

type AuditLog = {
  id: number;
  targetType: AuditTargetType;
  targetId: string;
  targetName: string;
  action: AuditAction;
  actor: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

type FlatValue = string | number | boolean | null;
type DiffRow = { path: string; before: FlatValue | undefined; after: FlatValue | undefined };

const API_BASE = '/inheritance-tax-docs/api/audit-logs';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: '追加',
  update: '編集',
  delete: '無効化',
  reorder: '並び替え',
  publish: '公開',
  restore: '復元',
};

const TARGET_LABELS: Record<AuditTargetType, string> = {
  document_master: '必要書類',
  resource: '参考資料',
};

const ACTION_STYLES: Record<AuditAction, string> = {
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  reorder: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  publish: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  restore: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
};

const flatten = (value: unknown, prefix = '', output = new Map<string, FlatValue>()): Map<string, FlatValue> => {
  if (value === null || typeof value !== 'object') {
    output.set(prefix || '値', value as FlatValue);
    return output;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) output.set(prefix || '値', '[]');
    value.forEach((item, index) => flatten(item, `${prefix}[${index + 1}]`, output));
    return output;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) output.set(prefix || '値', '{}');
  entries.forEach(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key, output));
  return output;
};

const buildDiff = (before: unknown, after: unknown): DiffRow[] => {
  const previous = flatten(before);
  const next = flatten(after);
  const paths = new Set([...previous.keys(), ...next.keys()]);
  return [...paths]
    .filter((path) => previous.get(path) !== next.get(path))
    .map((path) => ({ path, before: previous.get(path), after: next.get(path) }));
};

const formatValue = (value: FlatValue | undefined): string => {
  if (value === undefined) return '—';
  if (value === null) return 'なし';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  return String(value);
};

export const AuditLogPage = () => {
  const { operator } = useOperator();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [targetFilter, setTargetFilter] = useState<'all' | AuditTargetType>('all');
  const [actionFilter, setActionFilter] = useState<'all' | AuditAction>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (targetFilter !== 'all') params.set('targetType', targetFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      const response = await fetch(`${API_BASE}?${params}`);
      if (!response.ok) throw new Error('操作履歴を読み込めませんでした');
      setLogs(await response.json() as AuditLog[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作履歴を読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetFilter]);

  useEffect(() => { void load(); }, [load]);

  const latestResourceActions = useMemo(() => {
    const latest = new Map<string, AuditAction>();
    logs.forEach((log) => {
      if (log.targetType === 'resource' && !latest.has(log.targetId)) latest.set(log.targetId, log.action);
    });
    return latest;
  }, [logs]);

  const restoreResource = async (log: AuditLog) => {
    if (!window.confirm(`参考資料「${log.targetName}」を復元しますか？`)) return;
    setRestoringId(log.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/${log.id}/restore`, { method: 'POST', headers: operatorRequestHeaders(operator) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? '復元に失敗しました');
      setMessage(`「${log.targetName}」を復元しました`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '復元に失敗しました');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section role="tabpanel" aria-label="操作履歴" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />操作履歴</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">必要書類と参考資料の変更を時系列で保存しています。履歴は編集・削除できません。</p>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">対象
            <select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value as typeof targetFilter)} className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              <option value="all">すべて</option><option value="document_master">必要書類</option><option value="resource">参考資料</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">操作
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)} className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              <option value="all">すべて</option>{Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {message ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p> : null}

      {loading ? <p className="py-12 text-center text-sm text-slate-500">読み込み中…</p> : logs.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">該当する操作履歴はありません</p>
      ) : (
        <ol className="mt-5 space-y-3">
          {logs.map((log) => {
            const expanded = expandedId === log.id;
            const diff = expanded ? buildDiff(log.before, log.after) : [];
            const canRestore = log.targetType === 'resource' && log.action === 'delete' && latestResourceActions.get(log.targetId) === 'delete';
            return (
              <li key={log.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : log.id)} className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-slate-800" aria-expanded={expanded} aria-label={`${log.targetName}の変更内容を${expanded ? '閉じる' : '開く'}`}>
                    {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ACTION_STYLES[log.action]}`}>{ACTION_LABELS[log.action]}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{TARGET_LABELS[log.targetType]}</span>
                      <strong className="break-words text-sm">{log.targetName}</strong>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(`${log.createdAt}Z`).toLocaleString('ja-JP')}</span>
                      <span>操作者: {log.actor}</span>
                    </div>
                  </div>
                  {canRestore ? <button type="button" disabled={restoringId === log.id} onClick={() => void restoreResource(log)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950"><RotateCcw className="h-4 w-4" />{restoringId === log.id ? '復元中…' : '復元'}</button> : null}
                </div>

                {expanded ? (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                    <h3 className="text-sm font-bold">変更差分</h3>
                    {diff.length === 0 ? <p className="mt-2 text-sm text-slate-500">比較できる変更項目はありません。</p> : (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full min-w-[680px] text-left text-sm">
                          <thead className="bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2">項目</th><th className="px-3 py-2">変更前</th><th className="px-3 py-2">変更後</th></tr></thead>
                          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                            {diff.map((row) => <tr key={row.path}><th className="max-w-64 break-all px-3 py-2 align-top font-mono text-xs font-medium text-slate-600 dark:text-slate-300">{row.path}</th><td className="max-w-80 break-words px-3 py-2 align-top text-red-700 dark:text-red-300">{formatValue(row.before)}</td><td className="max-w-80 break-words px-3 py-2 align-top text-emerald-700 dark:text-emerald-300">{formatValue(row.after)}</td></tr>)}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
