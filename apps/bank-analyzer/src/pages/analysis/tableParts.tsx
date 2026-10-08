// 取引の表で使う部品（保存状態・分類の選択・並び替えの見出し・ページ送り）。
// 取引一覧・未分類・質問候補のタブで共通

import { useMemo } from 'react';
import type { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, Loader2 } from 'lucide-react';
import type { TxRow } from './types';

type SetParams = ReturnType<typeof useSearchParams>[1];

export const UNCATEGORIZED = '未分類';
const PER_PAGE_OPTIONS = [25, 50, 100, 200];

export function SaveState({ saving, failed }: { saving: number; failed: number }) {
  if (failed > 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800" role="status">
        <AlertTriangle size={12} />
        {failed}件の保存に失敗
      </span>
    );
  }
  if (saving > 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800" role="status">
        <Loader2 size={12} className="animate-spin" />
        {saving}件を保存中
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800" role="status">
      <Check size={12} />
      自動保存済み
    </span>
  );
}

export function CategoryCell({
  t,
  categories,
  saving,
  failed,
  onChange,
}: {
  t: TxRow;
  categories: string[];
  saving: boolean;
  failed: boolean;
  onChange: (c: string) => void;
}) {
  const options = categories.includes(t.category) ? categories : [t.category, ...categories];
  return (
    <select
      className={`input w-36 py-1 text-xs ${t.category === UNCATEGORIZED ? 'text-amber-800' : ''} ${failed ? 'border-red-500' : ''}`}
      aria-label={`${t.description || '取引'} の分類`}
      aria-invalid={failed}
      aria-busy={saving}
      value={t.category}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

// 並び替えの見出し。日付は昇順から、金額は大きい順から
export function SortHeader({
  label,
  field,
  params,
  setParams,
  right,
  pageParam = 'page',
}: {
  label: string;
  field: 'date' | 'amount_out' | 'amount_in';
  params: URLSearchParams;
  setParams: SetParams;
  right?: boolean;
  pageParam?: string;
}) {
  const current = params.get('sort') || 'date_asc';
  const dir = current === `${field}_asc` ? 'asc' : current === `${field}_desc` ? 'desc' : null;
  const first = field === 'date' ? 'asc' : 'desc';
  const next = dir === null ? first : dir === 'asc' ? 'desc' : 'asc';
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'} className={right ? 'text-right' : ''}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 ${dir ? 'text-blue-800' : ''}`}
        onClick={() => {
          const q = new URLSearchParams(params);
          q.set('sort', `${field}_${next}`);
          q.delete(pageParam);
          setParams(q);
        }}
      >
        {label}
        <Icon size={12} aria-hidden="true" />
      </button>
    </th>
  );
}

export function Pagination({
  page,
  pageCount,
  perPage,
  params,
  setParams,
  pageParam = 'page',
  label = 'ページ',
}: {
  page: number;
  pageCount: number;
  // 表示件数を選ばせない一覧（摘要グループ）は省く
  perPage?: number;
  params: URLSearchParams;
  setParams: SetParams;
  pageParam?: string;
  label?: string;
}) {
  const go = (p: number) => {
    const q = new URLSearchParams(params);
    if (p <= 1) q.delete(pageParam);
    else q.set(pageParam, String(p));
    setParams(q);
  };
  const pages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, pageCount - 4));
    return Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  }, [page, pageCount]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      {pageCount > 1 ? (
        <nav aria-label={label} className="flex flex-wrap items-center gap-1">
          {(
            [
              ['最初', 1],
              ['前へ', page - 1],
            ] as const
          ).map(([l, p]) => (
            <button key={l} type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => go(p)}>
              {l}
            </button>
          ))}
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => go(p)}
            >
              {p}
            </button>
          ))}
          <span className="px-1 text-xs text-slate-500">/ {pageCount}</span>
          {(
            [
              ['次へ', page + 1],
              ['最後', pageCount],
            ] as const
          ).map(([l, p]) => (
            <button key={l} type="button" className="btn btn-secondary btn-sm" disabled={page >= pageCount} onClick={() => go(p)}>
              {l}
            </button>
          ))}
        </nav>
      ) : (
        <span />
      )}
      {perPage !== undefined && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          表示件数
          <select
            className="input w-auto py-1"
            value={perPage}
            onChange={(e) => {
              const q = new URLSearchParams(params);
              q.set('per_page', e.target.value);
              q.delete(pageParam);
              setParams(q);
            }}
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}件
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

