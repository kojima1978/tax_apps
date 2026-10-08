// 未分類タブ（Django: _tab_unclassified.html・analysis_tabs.js の ClassificationWorkbench / GroupedView）。
// 残りの件数と進み具合・高信頼度の候補のまとめ適用・よく使う分類のボタン（数字キー）・
// 個別の一覧（行ごとの分類・まとめての分類・削除）・摘要グループの一覧（グループごと分類）。
//
// Django 版との違い（直したもの）:
// - 「高信頼度候補」の件数と候補の欄は、サーバーがこのタブに値を渡していなかったため
//   常に0で、欄も一度も出ていなかった。サーバーから渡す
// - 個別／グループの切り替えを画面の中だけで持っていたため、グループのページ送りや読み直しで
//   個別表示へ戻っていた。URL（view=grouped）に持たせる
// - グループの分類のあと、取引を1件だけ読み直して「DB検証済み」と出していた。
//   一括の更新は1つの処理で済むので、結果の件数をそのまま出す

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  CheckCheck,
  CircleCheck,
  CircleHelp,
  Layers,
  Lightbulb,
  List,
  Pencil,
  Search,
  SearchX,
  Sparkles,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api, errorMessage } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import { CategoryCell, Pagination, SaveState, SortHeader, UNCATEGORIZED } from './tableParts';
import { PatternAddDialog, TxEditDialog, type PatternTarget } from './TxDialogs';
import { AccountCell, RefDateBadge, RowContextMenu, amountCell, type RowMenuActions } from './txParts';
import type { DashboardSummary, TabData, TxRow } from './types';
import type { UnclassifiedGroup } from '../../../server/lib/aggregate';

type Props = { dash: DashboardSummary & TabData['unclassified']; reload: () => void };
type Group = UnclassifiedGroup;

const RECENT_KEY = 'bankAnalyzerRecentCategories';
const QUICK_COUNT = 6;
const HIGH_CONFIDENCE = 95;
const RELOAD_DELAY_MS = 800;

const readRecent = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

// よく使う分類: 直近に使った順、残りは分類の並び順
function quickCategories(categories: string[], recent: string[]): string[] {
  const rank = (c: string) => {
    const i = recent.indexOf(c);
    return i < 0 ? 999 : i;
  };
  return categories
    .filter((c) => c !== UNCATEGORIZED)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .slice(0, QUICK_COUNT)
    .map((x) => x.c);
}

export function UnclassifiedTab({ dash, reload }: Props) {
  const caseId = dash.case.id;
  const categories = dash.options.categories;
  const notice = useNotice();
  const { busy, run } = useAction();
  const [params, setParams] = useSearchParams();
  const grouped = params.get('view') === 'grouped';
  const keyword = params.get('keyword') ?? '';
  const page = dash.unclassifiedTxs;
  const groupPage = dash.unclassifiedGroups;

  // 一覧はサーバーの1ページ分の写し。分類したものは先に画面から消す
  const [rows, setRows] = useState<TxRow[]>(page.items);
  const [groups, setGroups] = useState<Group[]>(groupPage.items);
  // 読み直すまでに分類・削除で減った件数（取引）と組数
  const [done, setDone] = useState(0);
  const [doneGroups, setDoneGroups] = useState(0);
  const [lastItems, setLastItems] = useState(page.items);
  const [lastGroups, setLastGroups] = useState(groupPage.items);
  if (lastItems !== page.items || lastGroups !== groupPage.items) {
    setLastItems(page.items);
    setLastGroups(groupPage.items);
    setRows(page.items);
    setGroups(groupPage.items);
    setDone(0);
    setDoneGroups(0);
  }

  // 今回この画面で分類した件数（読み直しても消さない）
  const [session, setSession] = useState(0);
  const [recent, setRecent] = useState(readRecent);
  const quick = useMemo(() => quickCategories(categories, recent), [categories, recent]);

  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [focusIdx, setFocusIdx] = useState(-1);
  const [search, setSearch] = useState(keyword);

  const [editTx, setEditTx] = useState<TxRow | null>(null);
  const [patternTarget, setPatternTarget] = useState<PatternTarget | null>(null);
  const [deleteIds, setDeleteIds] = useState<number[] | null>(null);
  const [groupConfirm, setGroupConfirm] = useState<{ group: Group; category: string } | null>(null);
  const [highConfirm, setHighConfirm] = useState(false);
  const [lastGroup, setLastGroup] = useState<PatternTarget | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; tx: TxRow } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // ページ・条件・表示が変わったら選択とフォーカスは外す
  const pageKey = params.toString();
  const [lastPageKey, setLastPageKey] = useState(pageKey);
  if (lastPageKey !== pageKey) {
    setLastPageKey(pageKey);
    setSelected(new Set());
    setFocusIdx(-1);
    setSearch(keyword);
  }

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

  const remember = (category: string) => {
    const next = [category, ...recent.filter((c) => c !== category)].slice(0, QUICK_COUNT);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても今の画面では並びが変わる
    }
  };

  const setParam = (key: string, value: string | null, resetPages = true) => {
    const q = new URLSearchParams(params);
    if (value) q.set(key, value);
    else q.delete(key);
    if (resetPages) {
      q.delete('unclassified_page');
      q.delete('group_page');
    }
    setParams(q);
  };

  // ---- 個別の一覧 ----

  const classifyTx = async (tx: TxRow, category: string) => {
    if (category === UNCATEGORIZED || saving.has(tx.id)) return;
    setIn(setSaving, tx.id, true);
    setIn(setFailed, tx.id, false);
    pending.current += 1;
    try {
      await api.post(`/cases/${caseId}/categories/update`, { txId: tx.id, category, applyAll: false });
      setRows((rs) => rs.filter((r) => r.id !== tx.id));
      setSelected((s) => {
        const n = new Set(s);
        n.delete(tx.id);
        return n;
      });
      setDone((n) => n + 1);
      setSession((n) => n + 1);
      remember(category);
    } catch (e) {
      setIn(setFailed, tx.id, true);
      notice.error(`分類を保存できませんでした: ${errorMessage(e)}`);
    } finally {
      setIn(setSaving, tx.id, false);
      pending.current -= 1;
      scheduleReload();
    }
  };

  const toggleFlag = async (tx: TxRow) => {
    const res = await run('flag', () => api.post<{ isFlagged: boolean }>(`/cases/${caseId}/transactions/${tx.id}/flag`));
    if (!res) return;
    setRows((rs) => rs.map((r) => (r.id === tx.id ? { ...r, isFlagged: res.isFlagged } : r)));
    notice.success(res.isFlagged ? '質問候補に追加しました' : '質問候補から外しました');
    scheduleReload();
  };

  const bulkApply = async () => {
    if (!bulkCategory || selected.size === 0) return;
    const updates = Object.fromEntries([...selected].map((id) => [String(id), bulkCategory]));
    const res = await run('bulk', () => api.post<{ count: number; message: string }>(`/cases/${caseId}/categories/bulk`, { updates, sourceTab: 'unclassified' }));
    if (!res) return;
    notice.success(res.message);
    setSession((n) => n + res.count);
    remember(bulkCategory);
    setSelected(new Set());
    setBulkCategory('');
    reload();
  };

  const removeSelected = async () => {
    if (!deleteIds) return;
    const res = await run('delete', () => api.post<{ message: string }>(`/cases/${caseId}/transactions/delete-unclassified`, { ids: deleteIds }));
    setDeleteIds(null);
    if (!res) return;
    notice.success(res.message);
    setSelected(new Set());
    reload();
  };

  const openPattern = (tx: Pick<TxRow, 'description' | 'category'>) => {
    if (tx.category === UNCATEGORIZED) {
      notice.error('先に分類を選択してください');
      return;
    }
    setPatternTarget({ description: tx.description, category: tx.category });
  };

  const menuActions: RowMenuActions = {
    edit: setEditTx,
    flag: (t) => void toggleFlag(t),
    pattern: openPattern,
    category: (t, c) => void classifyTx(t, c),
    remove: (t) => setDeleteIds([t.id]),
  };

  const toggleSelect = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  // ---- 摘要グループ ----

  const classifyGroup = async (group: Group, category: string) => {
    setGroupConfirm(null);
    const updates = Object.fromEntries(group.txIds.map((id) => [String(id), category]));
    const res = await run(`group:${group.description}`, () =>
      api.post<{ count: number }>(`/cases/${caseId}/categories/bulk`, { updates, sourceTab: 'unclassified' }),
    );
    if (!res) return;
    setGroups((gs) => gs.filter((g) => g.description !== group.description));
    setDone((n) => n + res.count);
    setDoneGroups((n) => n + 1);
    setSession((n) => n + res.count);
    remember(category);
    setLastGroup({ description: group.description, category });
    notice.success(`「${group.description}」${res.count}件を「${category}」に分類しました`);
    scheduleReload();
  };

  // 2件以上をまとめて変えるときだけ確かめる
  const askGroup = (group: Group, category: string) => {
    if (!category) return;
    if (group.count > 1) setGroupConfirm({ group, category });
    else void classifyGroup(group, category);
  };

  // ---- 高信頼度の候補 ----

  const applyHighAll = async () => {
    setHighConfirm(false);
    const res = await run('high', () => api.post<{ count: number; message: string }>(`/cases/${caseId}/classify/bulk-suggestions`, { minScore: HIGH_CONFIDENCE }));
    if (!res) return;
    notice.success(res.message);
    setSession((n) => n + res.count);
    reload();
  };

  const applyHighGroup = async (g: TabData['unclassified']['highConfidenceGroups'][number]) => {
    const updates = Object.fromEntries(g.txIds.map((id) => [String(id), g.suggestedCategory]));
    const res = await run(`high:${g.description}`, () =>
      api.post<{ count: number }>(`/cases/${caseId}/categories/bulk`, { updates, sourceTab: 'unclassified' }),
    );
    if (!res) return;
    notice.success(`「${g.description}」${res.count}件を「${g.suggestedCategory}」に分類しました`);
    setSession((n) => n + res.count);
    reload();
  };

  // ---- フォーカス中の行へ分類（ボタン・数字キー）----

  const focusedRowsLength = grouped ? groups.length : rows.length;
  const applyFocused = (category: string) => {
    if (grouped) {
      const g = groups[focusIdx];
      if (!g) return notice.error('分類する行を選択してください');
      askGroup(g, category);
    } else {
      const t = rows[focusIdx];
      if (!t) return notice.error('分類する行を選択してください');
      void classifyTx(t, category);
    }
  };

  // ---- キーボード操作 ----
  const anyDialog =
    editTx !== null || patternTarget !== null || deleteIds !== null || groupConfirm !== null || highConfirm || helpOpen || menu !== null;
  const keyState = useRef({ focusIdx, len: focusedRowsLength, quick, anyDialog, grouped, rows });
  keyState.current = { focusIdx, len: focusedRowsLength, quick, anyDialog, grouped, rows };
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const actionsRef = useRef({ applyFocused, toggleSelect, menuActions });
  actionsRef.current = { applyFocused, toggleSelect, menuActions };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = keyState.current;
      if (s.anyDialog || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea, [contenteditable=true], dialog, [role=menu]')) return;
      // ボタン・リンクの上では Enter / Space は本来の動きに任せる（分類ボタンを押した直後も数字キーは効かせる）
      if ((e.key === 'Enter' || e.key === ' ') && el.closest('button, a, summary')) return;
      const a = actionsRef.current;
      const move = (d: number) => {
        e.preventDefault();
        if (s.len === 0) return;
        const next = Math.max(0, Math.min(s.len - 1, s.focusIdx + d));
        setFocusIdx(next);
        bodyRef.current?.querySelectorAll(':scope > tr')[next]?.scrollIntoView({ block: 'nearest' });
      };
      if (e.key === 'j' || e.key === 'ArrowDown') return move(1);
      if (e.key === 'k' || e.key === 'ArrowUp') return move(-1);
      if (e.key === '?') return setHelpOpen(true);
      if (s.focusIdx < 0) return;
      if (/^[1-9]$/.test(e.key)) {
        const c = s.quick[Number(e.key) - 1];
        if (c) {
          e.preventDefault();
          a.applyFocused(c);
        }
        return;
      }
      if (e.key === 'Enter') {
        // その行の分類の選択欄へ
        e.preventDefault();
        bodyRef.current?.querySelectorAll(':scope > tr')[s.focusIdx]?.querySelector<HTMLSelectElement>('select')?.focus();
        return;
      }
      const tx = s.grouped ? undefined : s.rows[s.focusIdx];
      if (!tx) return;
      if (e.key === ' ') {
        e.preventDefault();
        a.toggleSelect(tx.id);
      } else if (e.key === 'e') a.menuActions.edit(tx);
      else if (e.key === 'f') a.menuActions.flag(tx);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ---- 数字 ----
  const remaining = Math.max(0, dash.unclassifiedCount - done);
  const classified = Math.min(dash.totalTxCount, dash.classifiedCount + done);
  const pct = dash.totalTxCount > 0 ? Math.round((classified / dash.totalTxCount) * 1000) / 10 : 0;
  const groupCount = Math.max(0, dash.unclassifiedGroupCount - doneGroups);
  const total = page.total - done;

  if (dash.unclassifiedCount === 0 && !keyword) return <AllDone flagged={dash.flaggedCount} />;

  return (
    <div className="space-y-3">
      {/* 残りと進み具合 */}
      <section className="card space-y-3 p-4" aria-label="未分類の整理状況">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['残り', remaining, '件', true],
              ['グループ候補', groupCount, '組', false],
              ['高信頼度候補', dash.highConfidenceTxCount, '件', false],
              ['今回の処理', session, '件', false],
            ] as const
          ).map(([label, value, unit, primary]) => (
            <div key={label} className={`rounded-md border px-3 py-2 ${primary ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
              <span className="block text-xs text-slate-600">{label}</span>
              <strong className="text-xl tabular-nums">{num(value)}</strong>
              <small className="ml-0.5 text-xs text-slate-500">{unit}</small>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>
              整理済み <span className="tabular-nums">{num(classified)}</span> / <span className="tabular-nums">{num(dash.totalTxCount)}</span>件
            </span>
            <strong className="tabular-nums">{pct}%</strong>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="整理済みの割合"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full transition-[width] ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <li>① 高信頼度の候補をまとめて適用</li>
          <li>② 摘要グループでまとめて分類</li>
          <li>③ 残りを1件ずつ分類</li>
        </ol>
      </section>

      {/* 高信頼度の候補 */}
      {dash.highConfidenceGroups.length > 0 && (
        <section className="card border-emerald-200 bg-emerald-50/40 p-4" aria-labelledby="highConfidenceHeading">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles size={20} className="text-emerald-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 id="highConfidenceHeading" className="text-sm font-semibold">
                高信頼度の分類候補が{num(dash.highConfidenceTxCount)}件あります
              </h3>
              <p className="text-xs text-slate-600">{HIGH_CONFIDENCE}%以上の候補だけを対象にします。適用前に下の内訳を確認できます。</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => setHighConfirm(true)}>
              <CheckCheck size={14} />
              {num(dash.highConfidenceTxCount)}件をまとめて適用
            </button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-emerald-800">候補の内訳を見る</summary>
            <ul className="mt-2 divide-y divide-emerald-100 rounded border border-emerald-100 bg-white text-sm">
              {dash.highConfidenceGroups.map((g) => (
                <li key={g.description} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 px-3 py-1.5">
                  <span className="truncate" title={g.description}>
                    {g.description}
                  </span>
                  <span className="text-xs tabular-nums">{num(g.count)}件</span>
                  <strong className="text-xs">{g.suggestedCategory}</strong>
                  <span className="text-xs text-emerald-700 tabular-nums">{g.score}%</span>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => void applyHighGroup(g)}>
                    適用
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* 検索と表示の切り替え */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          role="search"
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParam('keyword', search.trim() || null);
          }}
        >
          <label className="sr-only" htmlFor="unclassifiedKeyword">
            摘要で絞り込み
          </label>
          <input
            id="unclassifiedKeyword"
            className="input max-w-72"
            type="search"
            placeholder="摘要で絞り込み"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            <Search size={14} />
            検索
          </button>
          {keyword && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setParam('keyword', null)}>
              <X size={14} />
              解除
            </button>
          )}
        </form>
        <div className="flex rounded-md border border-slate-300" role="group" aria-label="表示の切り替え">
          {(
            [
              [false, '個別', List],
              [true, 'グループ', Layers],
            ] as const
          ).map(([g, label, Icon]) => (
            <button
              key={label}
              type="button"
              aria-pressed={grouped === g}
              className={`flex items-center gap-1 px-3 py-1 text-sm first:rounded-l-md last:rounded-r-md ${grouped === g ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setParam('view', g ? 'grouped' : null, false)}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHelpOpen(true)} title="キーボード操作（?）">
          <CircleHelp size={14} />
          <span className="sr-only">キーボード操作</span>
        </button>
      </div>

      {/* よく使う分類 */}
      <section className="card flex flex-wrap items-center gap-2 px-3 py-2" aria-label="よく使う分類">
        <span className="text-xs text-slate-600">行を選んで、ボタンか数字キーで分類</span>
        <div className="flex flex-wrap gap-1">
          {quick.map((c, i) => (
            <button key={c} type="button" className="btn btn-secondary btn-sm" disabled={focusIdx < 0} onClick={() => applyFocused(c)}>
              <kbd className="rounded border border-slate-300 bg-slate-50 px-1 text-[10px]">{i + 1}</kbd>
              {c}
            </button>
          ))}
        </div>
      </section>

      {lastGroup && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm" role="status">
          <Tags size={14} className="text-blue-700" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            「<span className="font-medium">{lastGroup.description}</span>」を次から自動で「{lastGroup.category}」に分類しますか？
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPatternTarget(lastGroup)}>
            パターンに登録
          </button>
          <button type="button" className="rounded p-1 text-slate-500 hover:bg-blue-100" aria-label="閉じる" onClick={() => setLastGroup(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {grouped ? (
        <section className="card" aria-label="摘要グループ">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm">
            <Layers size={16} className="text-amber-600" aria-hidden="true" />
            摘要グループ: <strong className="tabular-nums">{num(groupCount)}</strong>組 /
            <strong className="tabular-nums">{num(Math.max(0, dash.unclassifiedTxTotal - done))}</strong>件
            {keyword && <small className="text-slate-500">（「{keyword}」で絞り込み中）</small>}
          </div>
          {groups.length === 0 ? (
            <NoMatch keyword={keyword} onClear={() => setParam('keyword', null)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="min-w-72">摘要・対象取引</th>
                    <th className="w-32">件数</th>
                    <th className="w-28 text-right">払戻合計</th>
                    <th className="w-28 text-right">お預り合計</th>
                    <th className="min-w-48">分類</th>
                  </tr>
                </thead>
                <tbody ref={bodyRef}>
                  {groups.map((g, i) => (
                    <GroupRow
                      key={g.description}
                      g={g}
                      focused={i === focusIdx}
                      onFocus={() => setFocusIdx(i)}
                      max={dash.maxGroupCount}
                      suggestion={dash.groupSuggestions[g.description]}
                      categories={categories}
                      busy={busy === `group:${g.description}`}
                      onClassify={(c) => askGroup(g, c)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={groupPage.page} pageCount={groupPage.pageCount} params={params} setParams={setParams} pageParam="group_page" label="グループのページ" />
        </section>
      ) : (
        <section className="card" aria-label="未分類の取引">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm">
            <span>
              <strong className="tabular-nums">{num(total)}</strong>件{keyword && <small className="ml-1 text-slate-500">（「{keyword}」で絞り込み中）</small>}
            </span>
            <SaveState saving={saving.size} failed={failed.size} />
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50 px-3 py-2 text-sm" role="region" aria-label="選択した取引の操作">
              <strong>{num(selected.size)}件選択中</strong>
              <select className="input w-auto py-1" aria-label="変更後の分類" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
                <option value="">分類を選択…</option>
                {categories
                  .filter((c) => c !== UNCATEGORIZED)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <button type="button" className="btn btn-primary btn-sm" disabled={!bulkCategory || busy !== null} onClick={bulkApply}>
                選択を一括変更
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy !== null} onClick={() => setDeleteIds([...selected])}>
                <Trash2 size={14} />
                選択を削除
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
                選択解除
              </button>
            </div>
          )}

          {rows.length === 0 ? (
            <NoMatch keyword={keyword} onClear={() => setParam('keyword', null)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        aria-label="このページの取引をすべて選択"
                        checked={allChecked}
                        onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                      />
                    </th>
                    <th className="w-8">
                      <span className="sr-only">削除</span>
                    </th>
                    <SortHeader label="日付" field="date" params={params} setParams={setParams} pageParam="unclassified_page" />
                    <th>口座</th>
                    <th>摘要</th>
                    <SortHeader label="払戻" field="amount_out" params={params} setParams={setParams} right pageParam="unclassified_page" />
                    <SortHeader label="お預り" field="amount_in" params={params} setParams={setParams} right pageParam="unclassified_page" />
                    <th>分類</th>
                    <th className="w-20">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody ref={bodyRef}>
                  {rows.map((t, i) => (
                    <tr
                      key={t.id}
                      className={[
                        t.isFlagged ? 'bg-amber-50' : '',
                        selected.has(t.id) ? 'bg-blue-50' : '',
                        i === focusIdx ? 'outline-2 -outline-offset-2 outline-blue-500' : '',
                      ].join(' ')}
                      onClick={() => setFocusIdx(i)}
                      onDoubleClick={(e) => !(e.target as HTMLElement).closest('input, select, button') && setEditTx(t)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setFocusIdx(i);
                        setMenu({ x: e.clientX, y: e.clientY, tx: t });
                      }}
                    >
                      <td>
                        <input type="checkbox" aria-label={`${t.description || '取引'} を選択`} checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                      </td>
                      <td>
                        <button type="button" className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700" title="削除" aria-label="この取引を削除" onClick={() => setDeleteIds([t.id])}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {t.date ? warekiShort(t.date) : '－'}
                        <RefDateBadge date={t.date} referenceDate={dash.case.referenceDate} />
                      </td>
                      <td>
                        <AccountCell t={t} />
                      </td>
                      <td className="max-w-80">
                        <span className="block truncate" title={t.memo ? `${t.description}\nメモ: ${t.memo}` : t.description}>
                          {t.description}
                        </span>
                        {t.memo && <span className="block truncate text-xs text-slate-500">{t.memo}</span>}
                      </td>
                      <td className="text-right whitespace-nowrap text-red-700 tabular-nums">{amountCell(t, 'out')}</td>
                      <td className="text-right whitespace-nowrap text-blue-700 tabular-nums">{amountCell(t, 'in')}</td>
                      <td>
                        <CategoryCell t={t} categories={categories} saving={saving.has(t.id)} failed={failed.has(t.id)} onChange={(c) => void classifyTx(t, c)} />
                      </td>
                      <td className="whitespace-nowrap">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditTx(t)} aria-label={`${t.description || '取引'} を編集`} title="詳細・編集">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className={`ml-1 rounded p-1 ${t.isFlagged ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                          aria-pressed={t.isFlagged}
                          aria-label={t.isFlagged ? '付箋を外す' : '付箋を付ける'}
                          title={t.isFlagged ? '付箋を外す' : '付箋を付ける（質問候補）'}
                          onClick={() => void toggleFlag(t)}
                        >
                          {t.isFlagged ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page.page} pageCount={page.pageCount} perPage={page.perPage} params={params} setParams={setParams} pageParam="unclassified_page" />
        </section>
      )}

      <TxEditDialog
        caseId={caseId}
        tx={editTx}
        categories={categories}
        onClose={() => setEditTx(null)}
        onSaved={() => reload()}
        onPattern={(description, category) => openPattern({ description, category })}
      />
      <PatternAddDialog caseId={caseId} target={patternTarget} onClose={() => setPatternTarget(null)} />
      <ConfirmDialog
        open={deleteIds !== null}
        onClose={() => setDeleteIds(null)}
        onConfirm={removeSelected}
        title="未分類取引の削除"
        confirmLabel="削除"
        danger
        busy={busy === 'delete'}
      >
        {deleteIds?.length === 1 ? 'この取引を削除しますか？' : `選択した${num(deleteIds?.length ?? 0)}件の取引を削除しますか？`}
        <span className="mt-1 block text-xs text-slate-500">未分類のものだけが削除されます。元に戻せません。</span>
      </ConfirmDialog>
      <ConfirmDialog
        open={groupConfirm !== null}
        onClose={() => setGroupConfirm(null)}
        onConfirm={() => groupConfirm && void classifyGroup(groupConfirm.group, groupConfirm.category)}
        title="グループ分類の確認"
        confirmLabel={`${num(groupConfirm?.group.count ?? 0)}件を分類`}
      >
        摘要「{groupConfirm?.group.description}」の{num(groupConfirm?.group.count ?? 0)}件を「{groupConfirm?.category}」に分類します。
      </ConfirmDialog>
      <ConfirmDialog
        open={highConfirm}
        onClose={() => setHighConfirm(false)}
        onConfirm={applyHighAll}
        title="高信頼度の候補をまとめて適用"
        confirmLabel={`${num(dash.highConfidenceTxCount)}件を分類`}
        busy={busy === 'high'}
      >
        信頼度{HIGH_CONFIDENCE}%以上の候補{num(dash.highConfidenceTxCount)}件を、それぞれの候補の分類にします。上の「直前の分類変更」から元に戻せます。
      </ConfirmDialog>
      {menu && <RowContextMenu at={menu} tx={menu.tx} categories={categories} actions={menuActions} onClose={() => setMenu(null)} />}
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} quick={quick} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function GroupRow({
  g,
  focused,
  onFocus,
  max,
  suggestion,
  categories,
  busy,
  onClassify,
}: {
  g: Group;
  focused: boolean;
  onFocus: () => void;
  max: number;
  suggestion: { category: string; score: number } | undefined;
  categories: string[];
  busy: boolean;
  onClassify: (category: string) => void;
}) {
  const rest = g.count - g.samples.length;
  return (
    <tr className={focused ? 'outline-2 -outline-offset-2 outline-blue-500' : ''} onClick={onFocus}>
      <td className="max-w-96">
        <span className="block truncate font-medium" title={g.description}>
          {g.description || '（摘要なし）'}
        </span>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <details>
            <summary className="cursor-pointer text-slate-600">対象を確認</summary>
            <ul className="mt-1 space-y-0.5 text-slate-600">
              {g.samples.map((s, i) => (
                <li key={i} className="tabular-nums">
                  {s.date ? warekiShort(s.date) : '日付なし'}・{s.bankName || '口座不明'}・
                  {s.amountOut > 0 ? `払戻 ${num(s.amountOut)}円` : `お預り ${num(s.amountIn)}円`}
                </li>
              ))}
              {rest > 0 && <li className="text-slate-500">ほか{num(rest)}件</li>}
            </ul>
          </details>
          <Link to={`?tab=unclassified&keyword=${encodeURIComponent(g.description)}`} className="text-blue-700 underline">
            個別に確認
          </Link>
          {suggestion && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 hover:bg-amber-200"
              title={`押すと「${suggestion.category}」に分類`}
              disabled={busy}
              onClick={() => onClassify(suggestion.category)}
            >
              <Lightbulb size={12} aria-hidden="true" />
              {suggestion.category}
              <small className="tabular-nums">{suggestion.score}%</small>
            </button>
          )}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div className="h-full bg-amber-500" style={{ width: `${max > 0 ? Math.round((g.count / max) * 100) : 0}%` }} />
          </div>
          <span className="tabular-nums">{num(g.count)}</span>
        </div>
      </td>
      <td className="text-right text-red-700 tabular-nums">{g.totalOut > 0 ? num(g.totalOut) : ''}</td>
      <td className="text-right text-blue-700 tabular-nums">{g.totalIn > 0 ? num(g.totalIn) : ''}</td>
      <td>
        <select
          className="input w-40 py-1 text-xs"
          aria-label={`${g.description || '摘要なし'} の分類`}
          aria-busy={busy}
          disabled={busy}
          value=""
          onChange={(e) => onClassify(e.target.value)}
        >
          <option value="">分類を選択</option>
          {categories
            .filter((c) => c !== UNCATEGORIZED)
            .map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
        </select>
      </td>
    </tr>
  );
}

function NoMatch({ keyword, onClear }: { keyword: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center" role="status">
      <SearchX size={32} className="text-slate-400" aria-hidden="true" />
      <p className="font-semibold">{keyword ? '検索条件に一致する未分類取引はありません' : 'このページの未分類取引はありません'}</p>
      {keyword && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onClear}>
          検索条件を解除
        </button>
      )}
    </div>
  );
}

function AllDone({ flagged }: { flagged: number }) {
  return (
    <section className="card flex flex-col items-center gap-2 px-4 py-12 text-center" role="status">
      <CircleCheck size={40} className="text-emerald-600" aria-hidden="true" />
      <p className="text-lg font-semibold">すべて分類済みです</p>
      <p className="text-sm text-slate-600">未分類の取引は残っていません。</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link to="?tab=overview" className="btn btn-secondary btn-sm">
          概要へ戻る
        </Link>
        {flagged > 0 && (
          <Link to="?tab=flagged" className="btn btn-primary btn-sm">
            <Bookmark size={14} />
            質問候補を確認（{num(flagged)}件）
          </Link>
        )}
      </div>
    </section>
  );
}

function ShortcutHelp({ open, onClose, quick }: { open: boolean; onClose: () => void; quick: string[] }) {
  const keys: [string, string][] = [
    ['j / ↓', '次の行'],
    ['k / ↑', '前の行'],
    ['Enter', 'その行の分類欄へ'],
    ['Space', '選択・解除（個別）'],
    ['e', '編集（個別）'],
    ['f', '付箋を付ける・外す（個別）'],
    ['?', 'この一覧'],
  ];
  return (
    <Dialog open={open} onClose={onClose} title="キーボード操作" size="sm">
      <p className="mb-2 text-xs text-slate-500">行を押して選んでから使います。入力欄の中では効きません。</p>
      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {keys.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>
              <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 text-xs">{k}</kbd>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
        {quick.map((c, i) => (
          <div key={c} className="contents">
            <dt>
              <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 text-xs">{i + 1}</kbd>
            </dt>
            <dd>分類を「{c}」に</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
