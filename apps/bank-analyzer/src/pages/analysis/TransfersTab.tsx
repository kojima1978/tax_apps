// 資金移動フロータブ（Django: _tab_transfers.html と analysis_dashboard.js の資金移動まわり）。
// 検出した出金→入金の組の一覧・摘要と分類での絞り込み・両側の分類の自動保存・まとめての分類・CSV。
//
// Django 版との違い（直したもの）:
// - 「全て『振替』に分類」は選択肢から「振替」を探していたが、その名前の分類は無く（あるのは
//   「通帳間移動」）、押しても何も起きなかった。表示中の組の両側のうち「通帳間移動」でないものを、
//   件数を確かめてから categories/bulk の1回で分類する（履歴も1つなので「元に戻す」が1回で戻せる）
// - しかも動かしていたのは隠れているカード表示の選択欄で、1件ごとに要求を出していた
// - 表とカードの2通りの表示を持っていた（同じ選択欄が2つずつあり、片方だけ書き換わる）。表1つにした
// - 相手の入金が無い組の表示は消した。判定で組んだものだけを並べるので相手は必ずある（段階4）
// - CSV は取込時の印（is_transfer）で選んでいて、画面に出ている組と食い違っていた。
//   画面と同じ判定・絞り込み・並びで書き出す（services/exports.ts）

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, CheckCheck, CircleHelp, Download, Filter, Search, Wallet, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/Dialog';
import { DownloadButton } from '../../components/DownloadButton';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api, errorMessage } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import type { TransferEndpoint } from '../../../server/lib/aggregate';
import { CheckList } from './FilterPanel';
import { CategoryCell, SaveState, SortHeader } from './tableParts';
import type { DashboardSummary, TabData } from './types';

type Props = { dash: DashboardSummary & TabData['transfers']; reload: () => void };
type Pair = TabData['transfers']['transferPairs'][number];

const TRANSFER_CATEGORY = '通帳間移動';
const RELOAD_DELAY_MS = 800;
const FILTER_KEYS = ['keyword', 'transfer_category', 'transfer_category_mode'] as const;

export function TransfersTab({ dash, reload }: Props) {
  const caseId = dash.case.id;
  const categories = dash.options.categories;
  const notice = useNotice();
  const { busy, run } = useAction();
  const [params, setParams] = useSearchParams();
  const summary = dash.transferSummary;

  const [pairs, setPairs] = useState<Pair[]>(dash.transferPairs);
  const [lastPairs, setLastPairs] = useState(dash.transferPairs);
  if (lastPairs !== dash.transferPairs) {
    setLastPairs(dash.transferPairs);
    setPairs(dash.transferPairs);
  }

  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);

  const pending = useRef(0);
  const reloadTimer = useRef<number | undefined>(undefined);
  const scheduleReload = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => pending.current === 0 && reload(), RELOAD_DELAY_MS);
  }, [reload]);
  useEffect(() => () => window.clearTimeout(reloadTimer.current), []);

  const setIn = (setter: typeof setSaving, id: number, on: boolean) =>
    setter((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  // 同じ取引が2つの組に出ることは無いが、組の中の片側だけを書き換える
  const patch = (id: number, category: string) =>
    setPairs((ps) =>
      ps.map((p) =>
        p.source.id === id
          ? { ...p, source: { ...p.source, category } }
          : p.destination.id === id
            ? { ...p, destination: { ...p.destination, category } }
            : p,
      ),
    );

  const saveCategory = async (e: TransferEndpoint, category: string) => {
    if (e.category === category) return;
    const prev = e.category;
    patch(e.id, category);
    setIn(setSaving, e.id, true);
    setIn(setFailed, e.id, false);
    pending.current += 1;
    try {
      await api.post(`/cases/${caseId}/categories/update`, { txId: e.id, category, applyAll: false });
    } catch (err) {
      patch(e.id, prev);
      setIn(setFailed, e.id, true);
      notice.error(`分類を保存できませんでした: ${errorMessage(err)}`);
    } finally {
      setIn(setSaving, e.id, false);
      pending.current -= 1;
      scheduleReload();
    }
  };

  // 表示中の組の両側のうち、まだ「通帳間移動」でないもの
  const toClassify = pairs.flatMap((p) => [p.source, p.destination]).filter((e) => e.category !== TRANSFER_CATEGORY);
  const pairsToClassify = pairs.filter((p) => p.source.category !== TRANSFER_CATEGORY || p.destination.category !== TRANSFER_CATEGORY).length;

  const classifyAll = async () => {
    const updates = Object.fromEntries(toClassify.map((e) => [String(e.id), TRANSFER_CATEGORY]));
    const res = await run('classifyAll', () => api.post<{ message: string }>(`/cases/${caseId}/categories/bulk`, { updates, sourceTab: 'transfers' }));
    setConfirmAll(false);
    if (!res) return;
    notice.success(res.message);
    reload();
  };

  const filtered = FILTER_KEYS.some((k) => params.getAll(k).some((v) => v && !(k === 'transfer_category_mode' && v === 'include')));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['検出ペア数', `${num(summary.pairCount)}組`, ArrowLeftRight, 'text-blue-700'],
            ['総振替額', `${num(summary.totalAmount)}円`, Wallet, 'text-red-700'],
            ['未分類を含むペア', `${num(summary.unclassifiedCount)}組`, CircleHelp, 'text-amber-700'],
          ] as const
        ).map(([label, value, Icon, tone]) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <Icon size={24} className={tone} aria-hidden="true" />
            <div>
              <div className="text-lg font-bold tabular-nums">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <TransferFilter categories={categories} params={params} setParams={setParams} />

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-1 font-bold">
            <ArrowLeftRight size={16} aria-hidden="true" />
            検出された資金移動（{num(pairs.length)}組）
          </h2>
          {filtered && <span className="text-xs text-slate-500">絞り込み中</span>}
          <SaveState saving={saving.size} failed={failed.size} />
          <div className="ml-auto flex flex-wrap gap-2">
            {pairs.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmAll(true)}
                disabled={busy !== null || toClassify.length === 0}
                title={toClassify.length === 0 ? `表示中の組はすべて「${TRANSFER_CATEGORY}」です` : undefined}
              >
                <CheckCheck size={14} aria-hidden="true" />
                表示中を「{TRANSFER_CATEGORY}」に分類
              </button>
            )}
            <DownloadButton path={`/cases/${caseId}/export/csv/transfers`} params={csvParams(params)} title="表示中の組を書き出します">
              <Download size={14} aria-hidden="true" />
              CSV
            </DownloadButton>
          </div>
        </div>

        {pairs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{filtered ? '条件に合う資金移動はありません' : '資金移動は検出されませんでした'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th colSpan={4} className="bg-red-50 text-center text-red-800">
                    出金元
                  </th>
                  <th aria-label="差額" />
                  <th colSpan={4} className="bg-emerald-50 text-center text-emerald-800">
                    移動先
                  </th>
                </tr>
                <tr>
                  <SortHeader label="日付" field="date" params={params} setParams={setParams} />
                  <th>口座</th>
                  <SortHeader label="金額" field="amount_out" params={params} setParams={setParams} right />
                  <th>摘要・分類</th>
                  <th className="text-center">差額</th>
                  <th>日付</th>
                  <th>口座</th>
                  <th className="text-right">金額</th>
                  <th>摘要・分類</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p) => (
                  <tr key={`${p.source.id}-${p.destination.id}`}>
                    <EndpointCells e={p.source} sign="-" tone="text-red-700" {...{ categories, saving, failed, saveCategory }} />
                    <td className="text-center text-xs whitespace-nowrap">
                      <ArrowRight size={14} className="mx-auto text-blue-700" aria-hidden="true" />
                      {p.amountDiff > 0 ? <span className="text-amber-800">差額 {num(p.amountDiff)}円</span> : <span className="text-emerald-700">同額</span>}
                    </td>
                    <EndpointCells e={p.destination} sign="+" tone="text-emerald-700" {...{ categories, saving, failed, saveCategory }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          金額の許容誤差・日数の幅などの検出条件は
          <Link to="/settings" className="mx-1 text-blue-700 underline">
            設定
          </Link>
          で変えられます。
        </p>
      </div>

      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={classifyAll}
        title={`「${TRANSFER_CATEGORY}」に分類`}
        confirmLabel="分類する"
        busy={busy === 'classifyAll'}
      >
        表示中の{num(pairsToClassify)}組について、まだ「{TRANSFER_CATEGORY}」でない{num(toClassify.length)}件の取引を「{TRANSFER_CATEGORY}」に分類します。
        あとから「元に戻す」で一度に戻せます。
      </ConfirmDialog>
    </div>
  );
}

// CSV は画面と同じ絞り込み・並びで書き出す
function csvParams(params: URLSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  for (const k of [...FILTER_KEYS, 'sort'] as const) for (const v of params.getAll(k)) if (v) q.append(k, v);
  return q;
}

function EndpointCells({
  e,
  sign,
  tone,
  categories,
  saving,
  failed,
  saveCategory,
}: {
  e: TransferEndpoint;
  sign: '+' | '-';
  tone: string;
  categories: string[];
  saving: Set<number>;
  failed: Set<number>;
  saveCategory: (e: TransferEndpoint, c: string) => void;
}) {
  return (
    <>
      <td className="whitespace-nowrap">{warekiShort(e.date)}</td>
      <td className="text-xs">
        <div>{[e.bankName, e.branchName].filter(Boolean).join(' ') || '-'}</div>
        <div className="text-slate-500">{e.accountNumber}</div>
      </td>
      <td className={`text-right whitespace-nowrap tabular-nums ${tone}`}>
        {sign}
        {num(e.amount)}
      </td>
      <td className="min-w-40">
        <div className="max-w-56 truncate text-xs" title={e.description ?? undefined}>
          {e.description || '-'}
        </div>
        <CategoryCell t={e} categories={categories} saving={saving.has(e.id)} failed={failed.has(e.id)} onChange={(c) => saveCategory(e, c)} />
      </td>
    </>
  );
}

// 摘要のキーワードと分類（出金元・移動先のどちらか）で絞る。条件は URL に持つ
function TransferFilter({
  categories,
  params,
  setParams,
}: {
  categories: string[];
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
}) {
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');
  const [cats, setCats] = useState(params.getAll('transfer_category').filter(Boolean));
  const [mode, setMode] = useState(params.get('transfer_category_mode') === 'exclude' ? 'exclude' : 'include');
  const key = params.toString();
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setKeyword(params.get('keyword') ?? '');
    setCats(params.getAll('transfer_category').filter(Boolean));
    setMode(params.get('transfer_category_mode') === 'exclude' ? 'exclude' : 'include');
  }
  const applied = params.getAll('transfer_category').filter(Boolean);
  const exclude = params.get('transfer_category_mode') === 'exclude';

  const apply = (next: { keyword: string; cats: string[]; mode: string }) => {
    const q = new URLSearchParams(params);
    for (const k of FILTER_KEYS) q.delete(k);
    if (next.keyword.trim()) q.set('keyword', next.keyword.trim());
    for (const c of next.cats) q.append('transfer_category', c);
    if (next.cats.length && next.mode === 'exclude') q.set('transfer_category_mode', 'exclude');
    setParams(q);
  };
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    apply({ keyword, cats, mode });
  };

  return (
    <form onSubmit={submit} className="card flex flex-wrap items-center gap-2 p-3">
      <div className="relative">
        <Search size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          className="input w-64 py-1 pl-7"
          placeholder="摘要をキーワード検索"
          aria-label="摘要のキーワード"
          value={keyword}
          onChange={(ev) => setKeyword(ev.target.value)}
        />
      </div>
      <details className="relative">
        <summary className={`btn btn-sm cursor-pointer list-none ${applied.length ? 'btn-primary' : 'btn-secondary'}`}>
          <Filter size={14} aria-hidden="true" />
          {applied.length ? `分類: ${applied.length}件選択中` : '分類で絞り込み'}
        </summary>
        <div className="absolute z-20 mt-1 w-72 space-y-2 rounded border border-slate-200 bg-white p-3 shadow-lg">
          <CheckList label="分類（出金元・移動先のどちらか）" items={categories} checked={cats} onChange={setCats} />
          <div className="flex gap-4 text-sm">
            {(
              [
                ['include', '含む'],
                ['exclude', '除外'],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex items-center gap-1">
                <input type="radio" name="transferCategoryMode" value={v} checked={mode === v} onChange={() => setMode(v)} />
                {label}
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-sm w-full">
            適用
          </button>
        </div>
      </details>
      {applied.map((c) => (
        <span key={c} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${exclude ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
          {exclude ? '除外: ' : ''}
          {c}
          <button
            type="button"
            aria-label={`${c} の絞り込みを外す`}
            onClick={() => apply({ keyword: params.get('keyword') ?? '', cats: applied.filter((x) => x !== c), mode: exclude ? 'exclude' : 'include' })}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="ml-auto flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm">
          <Search size={14} aria-hidden="true" />
          検索
        </button>
        {(applied.length > 0 || params.get('keyword')) && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply({ keyword: '', cats: [], mode: 'include' })}>
            クリア
          </button>
        )}
      </div>
    </form>
  );
}
