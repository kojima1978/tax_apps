// 取引一覧の検索条件（Django: analysis.html の all タブ上部・_filter_panel.html）。
// 条件は URL のクエリだけが持つ（再読み込み・戻る・リンクの共有で同じ一覧が出る）。
// キー名はサーバーの filterQuery.ts と同じ（bank / account / category は繰り返し）

import { useMemo, useState, type FormEvent } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import type { SetURLSearchParams } from 'react-router-dom';
import { num, warekiShort } from '../../lib/format';
import type { FilterOptions } from './types';

// 条件のキー（解除のとき残す sort / per_page / tab は含めない）
const FILTER_KEYS = ['bank', 'account', 'category', 'category_mode', 'keyword', 'amount_min', 'amount_max', 'amount_type', 'date_from', 'date_to'] as const;
const LIST_KEYS = ['bank', 'account', 'category'] as const;
type ListKey = (typeof LIST_KEYS)[number];

const QUICK: { label: string; key: 'amount_type' | 'amount_min'; value: string }[] = [
  { label: '出金', key: 'amount_type', value: 'out' },
  { label: '入金', key: 'amount_type', value: 'in' },
  { label: '30万円〜', key: 'amount_min', value: '300000' },
  { label: '50万円〜', key: 'amount_min', value: '500000' },
  { label: '100万円〜', key: 'amount_min', value: '1000000' },
];

const AMOUNT_TYPE_LABEL = { both: '入出金', out: '出金', in: '入金' } as const;

const digits = (v: string) => v.replace(/[,，\s]/g, '');
const withCommas = (v: string) => (/^\d+$/.test(digits(v)) ? num(Number(digits(v))) : v);
const yenLabel = (v: string) => (/^\d+$/.test(digits(v)) ? `${num(Number(digits(v)))}円` : v);

// 条件を変えたら1ページ目へ戻す。タブは all のまま
export function useFilterParams(params: URLSearchParams, setParams: SetURLSearchParams) {
  return (mutate: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(params);
    mutate(q);
    q.set('tab', 'all');
    q.delete('page');
    setParams(q);
  };
}

// 書き出し（絞込結果CSV）に渡す条件だけ
export function filterOnly(params: URLSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  for (const key of [...FILTER_KEYS, 'sort'] as const) for (const v of params.getAll(key)) if (v) q.append(key, v);
  return q;
}

export function hasFilter(params: URLSearchParams): boolean {
  return FILTER_KEYS.some((k) => params.getAll(k).some((v) => v && !(k === 'category_mode' && v === 'include') && !(k === 'amount_type' && v === 'both')));
}

type Chip = { key: string; label: string; remove: (q: URLSearchParams) => void };

function chipsOf(params: URLSearchParams): Chip[] {
  const chips: Chip[] = [];
  const removeValue = (key: string, value: string) => (q: URLSearchParams) => {
    const rest = q.getAll(key).filter((v) => v !== value);
    q.delete(key);
    for (const v of rest) q.append(key, v);
    if (key === 'category' && rest.length === 0) q.delete('category_mode');
  };
  const removeKeys =
    (...keys: string[]) =>
    (q: URLSearchParams) => {
      for (const k of keys) q.delete(k);
    };

  const keyword = params.get('keyword');
  if (keyword) chips.push({ key: 'keyword', label: `キーワード: ${keyword}`, remove: removeKeys('keyword') });
  for (const b of params.getAll('bank').filter(Boolean)) chips.push({ key: `bank-${b}`, label: `銀行: ${b}`, remove: removeValue('bank', b) });
  for (const a of params.getAll('account').filter(Boolean)) chips.push({ key: `account-${a}`, label: `口座: ${a}`, remove: removeValue('account', a) });
  const exclude = params.get('category_mode') === 'exclude';
  for (const c of params.getAll('category').filter(Boolean)) {
    chips.push({ key: `category-${c}`, label: `分類${exclude ? '（除外）' : ''}: ${c}`, remove: removeValue('category', c) });
  }
  const type = params.get('amount_type');
  if (type === 'out' || type === 'in') chips.push({ key: 'amount_type', label: `${AMOUNT_TYPE_LABEL[type]}のみ`, remove: removeKeys('amount_type') });
  const min = params.get('amount_min');
  const max = params.get('amount_max');
  if (min || max) {
    const label = min && min === max ? `金額: ${yenLabel(min)}` : `金額: ${min ? yenLabel(min) : ''}〜${max ? yenLabel(max) : ''}`;
    chips.push({ key: 'amount', label, remove: removeKeys('amount_min', 'amount_max') });
  }
  const from = params.get('date_from');
  const to = params.get('date_to');
  if (from || to) {
    const label = from && from === to ? `日付: ${warekiShort(from)}` : `期間: ${from ? warekiShort(from) : ''}〜${to ? warekiShort(to) : ''}`;
    chips.push({ key: 'date', label, remove: removeKeys('date_from', 'date_to') });
  }
  return chips;
}

export function FilterPanel({
  params,
  setParams,
  options,
  detailOpen,
  setDetailOpen,
}: {
  params: URLSearchParams;
  setParams: SetURLSearchParams;
  options: FilterOptions;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
}) {
  const update = useFilterParams(params, setParams);
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');
  const [lastKeyword, setLastKeyword] = useState(params.get('keyword') ?? '');
  // 戻る・チップの解除などで URL のキーワードが変わったら入力欄も合わせる
  const urlKeyword = params.get('keyword') ?? '';
  if (urlKeyword !== lastKeyword) {
    setLastKeyword(urlKeyword);
    setKeyword(urlKeyword);
  }

  const chips = chipsOf(params);
  const detailCount = chips.filter((c) => c.key !== 'keyword').length;

  const search = (e: FormEvent) => {
    e.preventDefault();
    update((q) => (keyword.trim() ? q.set('keyword', keyword.trim()) : q.delete('keyword')));
  };
  const clearAll = () =>
    update((q) => {
      for (const k of FILTER_KEYS) q.delete(k);
    });

  return (
    <section className="card space-y-3 p-3" aria-label="検索条件">
      <form onSubmit={search} role="search" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            className="input pr-8 pl-8"
            placeholder="摘要で検索（空白区切りですべてを含む）"
            aria-label="摘要のキーワード"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100"
              aria-label="キーワードを消す"
              onClick={() => {
                setKeyword('');
                update((q) => q.delete('keyword'));
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          検索
        </button>
        <button type="button" className="btn btn-secondary btn-sm" aria-expanded={detailOpen} aria-controls="filterDetail" onClick={() => setDetailOpen(!detailOpen)}>
          <SlidersHorizontal size={14} />
          詳細条件
          {detailCount > 0 && <span className="rounded-full bg-blue-700 px-1.5 text-xs text-white">{detailCount}</span>}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="よく使う条件">
        <Filter size={14} className="text-slate-400" aria-hidden="true" />
        {QUICK.map(({ label, key, value }) => {
          const on = params.get(key) === value;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
              onClick={() => update((q) => (on ? q.delete(key) : q.set(key, value)))}
            >
              {label}
            </button>
          );
        })}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="適用中の条件">
          {chips.map((c) => (
            <span key={c.key} className="flex items-center gap-1 rounded bg-blue-50 py-0.5 pr-1 pl-2 text-xs text-blue-900">
              {c.label}
              <button type="button" className="rounded p-0.5 hover:bg-blue-100" aria-label={`条件「${c.label}」を外す`} onClick={() => update(c.remove)}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" className="text-xs text-blue-700 underline" onClick={clearAll}>
            すべて解除
          </button>
        </div>
      )}

      {detailOpen && <DetailForm key={params.toString()} params={params} options={options} onApply={(apply) => update(apply)} onClose={() => setDetailOpen(false)} />}
    </section>
  );
}

export function useClearFilters(params: URLSearchParams, setParams: SetURLSearchParams) {
  const update = useFilterParams(params, setParams);
  return () =>
    update((q) => {
      for (const k of FILTER_KEYS) q.delete(k);
    });
}

// 右クリックの「この日の取引だけ表示」「この金額の取引だけ表示」。ほかの条件は外して、
// 範囲の両端に同じ値を入れる。金額は入出金を問わない（口座間の移動の相手側も出る）
const SAME_KEYS = { date: ['date_from', 'date_to'], amount: ['amount_min', 'amount_max'] } as const;
export type SameKey = keyof typeof SAME_KEYS;

export function useShowSame(params: URLSearchParams, setParams: SetURLSearchParams) {
  const update = useFilterParams(params, setParams);
  return (key: SameKey, value: string) =>
    update((q) => {
      for (const k of FILTER_KEYS) q.delete(k);
      for (const k of SAME_KEYS[key]) q.set(k, value);
    });
}

// ---------------------------------------------------------------------------
// 詳細条件（開いている間は下書きを持ち、「適用」で URL へ）
// ---------------------------------------------------------------------------

type Draft = {
  bank: string[];
  account: string[];
  category: string[];
  categoryMode: 'include' | 'exclude';
  // 1日だけ: 欄を1つにして from と to に同じ日を入れる
  singleDay: boolean;
  dateFrom: string;
  dateTo: string;
  amountType: 'both' | 'out' | 'in';
  // ちょうど: 欄を1つにして min と max に同じ金額を入れる
  exactAmount: boolean;
  amountMin: string;
  amountMax: string;
};

function draftOf(params: URLSearchParams): Draft {
  const type = params.get('amount_type');
  const from = params.get('date_from') ?? '';
  const min = params.get('amount_min') ?? '';
  return {
    singleDay: from !== '' && from === params.get('date_to'),
    bank: params.getAll('bank').filter(Boolean),
    account: params.getAll('account').filter(Boolean),
    category: params.getAll('category').filter(Boolean),
    categoryMode: params.get('category_mode') === 'exclude' ? 'exclude' : 'include',
    dateFrom: from,
    dateTo: params.get('date_to') ?? '',
    amountType: type === 'out' || type === 'in' ? type : 'both',
    exactAmount: min !== '' && min === params.get('amount_max'),
    amountMin: withCommas(min),
    amountMax: withCommas(params.get('amount_max') ?? ''),
  };
}

function DetailForm({
  params,
  options,
  onApply,
  onClose,
}: {
  params: URLSearchParams;
  options: FilterOptions;
  onApply: (apply: (q: URLSearchParams) => void) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(() => draftOf(params));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));
  // 入っている方の日付を引き継ぐ。外したときは同じ日が両方に入った期間として残る
  const toggleSingleDay = (on: boolean) =>
    setD((s) => {
      const day = s.dateFrom || s.dateTo;
      return { ...s, singleDay: on, dateFrom: day, dateTo: day };
    });
  const toggleExactAmount = (on: boolean) =>
    setD((s) => {
      const amount = s.amountMin || s.amountMax;
      return { ...s, exactAmount: on, amountMin: amount, amountMax: amount };
    });

  // 銀行を選んでいれば、口座はその銀行のものだけ（選択済みの口座は残す）
  const accounts = useMemo(() => {
    if (d.bank.length === 0) return options.accounts;
    const inBanks = new Set(d.bank.flatMap((b) => options.bankToAccounts[b] ?? []));
    return options.accounts.filter((a) => inBanks.has(a) || d.account.includes(a));
  }, [d.bank, d.account, options]);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    onApply((q) => {
      for (const k of LIST_KEYS) q.delete(k);
      for (const k of LIST_KEYS) for (const v of d[k]) q.append(k, v);
      const single: [string, string][] = [
        ['category_mode', d.category.length && d.categoryMode === 'exclude' ? 'exclude' : ''],
        ['date_from', d.dateFrom],
        ['date_to', d.singleDay ? d.dateFrom : d.dateTo],
        ['amount_type', d.amountType === 'both' ? '' : d.amountType],
        ['amount_min', digits(d.amountMin)],
        ['amount_max', digits(d.exactAmount ? d.amountMin : d.amountMax)],
      ];
      for (const [k, v] of single) (v ? q.set(k, v) : q.delete(k));
    });
    onClose();
  };

  const lists: { key: ListKey; label: string; items: string[] }[] = [
    { key: 'bank', label: '銀行', items: options.banks },
    { key: 'account', label: '口座番号', items: accounts },
    { key: 'category', label: '分類', items: options.categories },
  ];

  return (
    <form id="filterDetail" onSubmit={apply} className="space-y-3 border-t border-slate-200 pt-3" aria-label="詳細条件">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {lists.map(({ key, label, items }) => (
          <CheckList
            key={key}
            label={label}
            items={items}
            checked={d[key]}
            onChange={(v) => set(key, v)}
            extra={
              key === 'category' && (
                <span className="flex gap-1.5">
                  {(
                    [
                      ['include', '含める'],
                      ['exclude', '除外する'],
                    ] as const
                  ).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1">
                      <input type="radio" name="categoryMode" checked={d.categoryMode === v} onChange={() => set('categoryMode', v)} />
                      {l}
                    </label>
                  ))}
                </span>
              )
            }
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <fieldset className="col-span-2 min-w-0">
          <legend className="label flex w-full items-center justify-between">
            <span>{d.singleDay ? '日付' : '期間'}</span>
            <label className="flex items-center gap-1 text-xs font-normal">
              <input type="checkbox" checked={d.singleDay} onChange={(e) => toggleSingleDay(e.target.checked)} />
              1日だけ
            </label>
          </legend>
          {d.singleDay ? (
            <input type="date" className="input" aria-label="日付" value={d.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
          ) : (
            <div className="flex items-center gap-1">
              <input type="date" className="input min-w-0" aria-label="期間（から）" value={d.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
              <span className="text-slate-500">〜</span>
              <input type="date" className="input min-w-0" aria-label="期間（まで）" value={d.dateTo} onChange={(e) => set('dateTo', e.target.value)} />
            </div>
          )}
        </fieldset>
        <div>
          <label className="label" htmlFor="fAmountType">
            入出金
          </label>
          <select id="fAmountType" className="input" value={d.amountType} onChange={(e) => set('amountType', e.target.value as Draft['amountType'])}>
            {(Object.keys(AMOUNT_TYPE_LABEL) as Draft['amountType'][]).map((k) => (
              <option key={k} value={k}>
                {k === 'both' ? 'すべて' : `${AMOUNT_TYPE_LABEL[k]}のみ`}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="col-span-2 min-w-0">
          <legend className="label flex w-full items-center justify-between">
            <span>金額</span>
            <label className="flex items-center gap-1 text-xs font-normal">
              <input type="checkbox" checked={d.exactAmount} onChange={(e) => toggleExactAmount(e.target.checked)} />
              ちょうど
            </label>
          </legend>
          {d.exactAmount ? (
            <AmountInput label="金額" value={d.amountMin} onChange={(v) => set('amountMin', v)} />
          ) : (
            <div className="flex items-center gap-1">
              <AmountInput label="金額（以上）" value={d.amountMin} onChange={(v) => set('amountMin', v)} />
              <span className="text-slate-500">〜</span>
              <AmountInput label="金額（以下）" value={d.amountMax} onChange={(v) => set('amountMax', v)} />
            </div>
          )}
        </fieldset>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
          閉じる
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          この条件で表示
        </button>
      </div>
    </form>
  );
}

function AmountInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="input min-w-0 text-right tabular-nums"
      inputMode="numeric"
      placeholder="円"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onChange(withCommas(e.target.value))}
    />
  );
}

export function CheckList({
  label,
  items,
  checked,
  onChange,
  extra,
}: {
  label: string;
  items: string[];
  checked: string[];
  onChange: (v: string[]) => void;
  // 見出しの行の右側に置くもの（分類の含める／除外する）
  extra?: React.ReactNode;
}) {
  const [q, setQ] = useState('');
  const shown = q ? items.filter((i) => i.includes(q)) : items;
  const toggle = (v: string) => onChange(checked.includes(v) ? checked.filter((x) => x !== v) : [...checked, v]);
  return (
    <fieldset className="min-w-0">
      <legend className="label flex w-full items-center justify-between">
        <span className="whitespace-nowrap">
          {label}
          {checked.length > 0 && <span className="ml-1 text-xs text-blue-700">{checked.length}件選択</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-normal whitespace-nowrap">
          {extra}
          {checked.length > 0 && (
            <button type="button" className="rounded p-0.5 text-blue-700 hover:bg-blue-50" aria-label={`${label}の選択を解除`} title="選択解除" onClick={() => onChange([])}>
              <X size={14} />
            </button>
          )}
        </span>
      </legend>
      <input type="search" className="input my-1 py-1 text-xs" placeholder={`${label}を絞り込む`} aria-label={`${label}を絞り込む`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-40 overflow-y-auto rounded border border-slate-200 p-1">
        {shown.length === 0 ? (
          <p className="px-1 text-xs text-slate-500">該当なし</p>
        ) : (
          shown.map((i) => (
            <label key={i} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} />
              <span className="truncate">{i}</span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}
