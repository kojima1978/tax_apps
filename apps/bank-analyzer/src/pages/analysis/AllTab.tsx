// 取引一覧・検索タブ（Django: analysis.html の all タブ・analysis_inline_edit.js・analysis_shortcuts.js）。
// 検索条件・一覧・行の分類の自動保存・まとめての分類変更・編集／追加／削除・付箋・右クリックの
// メニュー・キーボード操作。
//
// Django 版との違い（直したもの）:
// - まとめての分類変更は、選んだ行の数だけ要求を出していた（途中で1件失敗すると半端に残る）。
//   categories/bulk の1回で送り、履歴も1つにまとまる（「元に戻す」が1回で戻せる）
// - 行の分類の自動保存のあと、一覧の読み直しで検索条件が外れていた。条件は URL が持つので外れない
// - 一覧の行を innerHTML で組み立てていた（摘要にタグ文字があると、そのまま画面に入る）。
//   React が文字として出す
// - 分類を変えたあと、上の「直前の分類変更」と左のメニューの件数が古いままだった。
//   保存が落ち着いたところで読み直す

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Loader2,
  Pencil,
  Plus,
  Rows3,
  SearchX,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { DownloadButton } from '../../components/DownloadButton';
import { Menu } from '../../components/Menu';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api, errorMessage } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import { FilterPanel, filterOnly, hasFilter, useClearFilters } from './FilterPanel';
import { PatternAddDialog, TxAddDialog, TxEditDialog, type PatternTarget } from './TxDialogs';
import { AccountCell, RefDateBadge, RowContextMenu, amountCell, type RowMenuActions } from './txParts';
import type { DashboardSummary, TabData, TxRow } from './types';

type Props = { dash: DashboardSummary & TabData['all']; reload: () => void };

const UNCATEGORIZED = '未分類';
const PER_PAGE_OPTIONS = [25, 50, 100, 200];
const COMPACT_KEY = 'bankAnalyzer.compactTransactionTable';
// 分類を保存してから一覧を読み直すまで（続けて変えている間は待つ）
const RELOAD_DELAY_MS = 800;

const readCompact = () => {
  try {
    return localStorage.getItem(COMPACT_KEY) === '1';
  } catch {
    return false;
  }
};

export function AllTab({ dash, reload }: Props) {
  const caseId = dash.case.id;
  const categories = dash.options.categories;
  const notice = useNotice();
  const { busy, run } = useAction();
  const [params, setParams] = useSearchParams();
  const clearFilters = useClearFilters(params, setParams);
  const page = dash.allTxs;

  // 一覧はサーバーの1ページ分の写し。分類の変更は先に画面へ出し、失敗したら戻す
  const [rows, setRows] = useState<TxRow[]>(page.items);
  const [removed, setRemoved] = useState(0);
  const [lastItems, setLastItems] = useState(page.items);
  if (lastItems !== page.items) {
    setLastItems(page.items);
    setRows(page.items);
    setRemoved(0);
  }

  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [flashed, setFlashed] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [focusIdx, setFocusIdx] = useState(-1);
  const [compact, setCompact] = useState(readCompact);
  const [detailOpen, setDetailOpen] = useState(false);

  const [editTx, setEditTx] = useState<TxRow | null>(null);
  const [addBase, setAddBase] = useState<Partial<TxRow> | null>(null);
  const [patternTarget, setPatternTarget] = useState<PatternTarget | null>(null);
  const [deleteTx, setDeleteTx] = useState<TxRow | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; tx: TxRow } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // ページや条件が変わったら選択は外す
  const pageKey = params.toString();
  const [lastPageKey, setLastPageKey] = useState(pageKey);
  if (lastPageKey !== pageKey) {
    setLastPageKey(pageKey);
    setSelected(new Set());
    setFocusIdx(-1);
  }

  // 保存の数を数え、全部終わってから少し待って読み直す
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

  const saveCategory = async (tx: TxRow, category: string) => {
    if (tx.category === category) return;
    const prev = tx.category;
    setRows((rs) => rs.map((r) => (r.id === tx.id ? { ...r, category } : r)));
    setIn(setSaving, tx.id, true);
    setIn(setFailed, tx.id, false);
    pending.current += 1;
    try {
      const res = await api.post<{ stillVisible: boolean }>(`/cases/${caseId}/categories/update`, {
        txId: tx.id,
        category,
        applyAll: false,
        filterCategories: params.getAll('category').filter(Boolean),
        filterCategoryMode: params.get('category_mode') ?? 'include',
      });
      if (res.stillVisible) {
        setIn(setFlashed, tx.id, true);
        window.setTimeout(() => setIn(setFlashed, tx.id, false), 1200);
      } else {
        // 今の条件から外れた行は消す（分類で絞っているとき）
        setRows((rs) => rs.filter((r) => r.id !== tx.id));
        setRemoved((n) => n + 1);
      }
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === tx.id ? { ...r, category: prev } : r)));
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

  const openPattern = (tx: Pick<TxRow, 'description' | 'category'>) => {
    if (tx.category === UNCATEGORIZED) {
      notice.error('先に分類を選択してください');
      return;
    }
    setPatternTarget({ description: tx.description, category: tx.category });
  };

  const remove = async () => {
    if (!deleteTx) return;
    const res = await run('delete', () => api.delete<{ message: string }>(`/cases/${caseId}/transactions/${deleteTx.id}`));
    setDeleteTx(null);
    if (!res) return;
    notice.success(res.message);
    reload();
  };

  const bulkApply = async () => {
    if (!bulkCategory || selected.size === 0) return;
    const updates = Object.fromEntries([...selected].map((id) => [String(id), bulkCategory]));
    const res = await run('bulk', () => api.post<{ message: string }>(`/cases/${caseId}/categories/bulk`, { updates, sourceTab: 'all' }));
    if (!res) return;
    notice.success(res.message);
    setSelected(new Set());
    setBulkCategory('');
    reload();
  };

  const menuActions: RowMenuActions = {
    edit: setEditTx,
    flag: (t) => void toggleFlag(t),
    pattern: openPattern,
    category: (t, c) => void saveCategory(t, c),
    remove: setDeleteTx,
  };

  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    try {
      localStorage.setItem(COMPACT_KEY, next ? '1' : '0');
    } catch {
      // 保存できなくても今の画面では切り替わる
    }
  };

  const toggleSelect = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  // ---- キーボード操作（入力欄・ダイアログ・メニューの中では効かせない）----
  const anyDialog = editTx !== null || addBase !== null || patternTarget !== null || deleteTx !== null || helpOpen || menu !== null;
  const keyState = useRef({ rows, focusIdx, categories, anyDialog });
  keyState.current = { rows, focusIdx, categories, anyDialog };
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const actionsRef = useRef({ menuActions, toggleSelect, openPattern });
  actionsRef.current = { menuActions, toggleSelect, openPattern };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = keyState.current;
      if (s.anyDialog || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea, [contenteditable=true], dialog, [role=menu]')) return;
      const tx = s.rows[s.focusIdx];
      const move = (d: number) => {
        e.preventDefault();
        const next = Math.max(0, Math.min(s.rows.length - 1, s.focusIdx + d));
        setFocusIdx(next);
        tableRef.current?.querySelectorAll('tr')[next]?.scrollIntoView({ block: 'nearest' });
      };
      const a = actionsRef.current;
      if (e.key === 'j' || e.key === 'ArrowDown') move(1);
      else if (e.key === 'k' || e.key === 'ArrowUp') move(-1);
      else if (e.key === '?') setHelpOpen(true);
      else if (!tx) return;
      else if (e.key === ' ') {
        e.preventDefault();
        a.toggleSelect(tx.id);
      } else if (e.key === 'e' || e.key === 'Enter') a.menuActions.edit(tx);
      else if (e.key === 'f') a.menuActions.flag(tx);
      else if (e.key === 'p') a.openPattern(tx);
      else if (/^[1-9]$/.test(e.key)) {
        const c = s.categories[Number(e.key) - 1];
        if (c) a.menuActions.category(tx, c);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const total = page.total - removed;
  const from = total === 0 ? 0 : (page.page - 1) * page.perPage + 1;
  const to = Math.min(total, from + rows.length - 1);

  return (
    <div className="space-y-3">
      <FilterPanel params={params} setParams={setParams} options={dash.options} detailOpen={detailOpen} setDetailOpen={setDetailOpen} />

      <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
        <Bookmark size={14} aria-hidden="true" />
        不明な取引は付箋を付けて、質問候補として残せます。
        <Link to="?tab=flagged" className="text-blue-700 underline">
          質問候補を見る
        </Link>
      </p>

      <section className="card" aria-label="取引一覧">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
          <span className="text-sm">
            <strong className="tabular-nums">{num(total)}</strong>件
            {total > 0 && (
              <span className="ml-1 text-xs text-slate-500">
                （{num(from)}〜{num(to)}件を表示）
              </span>
            )}
          </span>
          <SaveState saving={saving.size} failed={failed.size} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" aria-pressed={compact} onClick={toggleCompact} title="行の高さを詰める">
              <Rows3 size={14} />
              {compact ? '標準表示' : 'コンパクト'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHelpOpen(true)} title="キーボード操作（?）">
              <CircleHelp size={14} />
              <span className="sr-only">キーボード操作</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddBase({})}>
              <Plus size={14} />
              取引追加
            </button>
            <Menu
              label="書き出し"
              trigger={
                <>
                  <Download size={14} />
                  書き出し
                  <ChevronDown size={14} />
                </>
              }
            >
              {() => (
                <>
                  <DownloadButton path={`/cases/${caseId}/export/csv-filtered`} params={filterOnly(params)} className="menu-item">
                    絞込結果CSV（{num(total)}件）
                  </DownloadButton>
                  <DownloadButton path={`/cases/${caseId}/export/csv/all`} className="menu-item">
                    全データCSV
                  </DownloadButton>
                  <DownloadButton path={`/cases/${caseId}/export/xlsx/categories`} className="menu-item">
                    分類別Excel
                  </DownloadButton>
                  <DownloadButton path={`/cases/${caseId}/export/json`} className="menu-item">
                    JSONバックアップ
                  </DownloadButton>
                </>
              )}
            </Menu>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50 px-3 py-2 text-sm" role="region" aria-label="選択した取引の操作">
            <strong>{num(selected.size)}件選択中</strong>
            <select className="input w-auto py-1" aria-label="変更後の分類" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
              <option value="">分類を選択…</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-primary btn-sm" disabled={!bulkCategory || busy !== null} onClick={bulkApply}>
              選択を一括変更
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
              選択解除
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <Empty filtered={hasFilter(params)} onClear={clearFilters} onDetail={() => setDetailOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className={`table-base ${compact ? '[&_td]:py-0.5' : ''}`}>
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
                  <th className="w-16">
                    <span className="sr-only">行の操作</span>
                  </th>
                  <SortHeader label="日付" field="date" params={params} setParams={setParams} />
                  <th>口座</th>
                  <th>摘要</th>
                  <SortHeader label="払戻" field="amount_out" params={params} setParams={setParams} right />
                  <SortHeader label="お預り" field="amount_in" params={params} setParams={setParams} right />
                  <th>分類</th>
                  <th className="w-20">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {rows.map((t, i) => (
                  <tr
                    key={t.id}
                    className={[
                      t.isFlagged ? 'bg-amber-50' : '',
                      flashed.has(t.id) ? 'bg-emerald-50 transition-colors' : '',
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
                    <td className="whitespace-nowrap">
                      <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" title="この下に追加" aria-label="この下に取引を追加" onClick={() => setAddBase(t)}>
                        <Plus size={14} />
                      </button>
                      <button type="button" className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700" title="削除" aria-label="この取引を削除" onClick={() => setDeleteTx(t)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {t.date ? warekiShort(t.date) : '－'}
                      <RefDateBadge date={t.date} referenceDate={dash.case.referenceDate} />
                    </td>
                    <td>
                      <AccountCell t={t} compact={compact} />
                    </td>
                    <td className="max-w-80">
                      <span className="block truncate" title={t.memo ? `${t.description}\nメモ: ${t.memo}` : t.description}>
                        {t.description}
                      </span>
                      {t.memo && !compact && <span className="block truncate text-xs text-slate-500">{t.memo}</span>}
                    </td>
                    <td className="text-right whitespace-nowrap text-red-700 tabular-nums">{amountCell(t, 'out')}</td>
                    <td className="text-right whitespace-nowrap text-blue-700 tabular-nums">{amountCell(t, 'in')}</td>
                    <td>
                      <CategoryCell
                        t={t}
                        categories={categories}
                        saving={saving.has(t.id)}
                        failed={failed.has(t.id)}
                        onChange={(c) => void saveCategory(t, c)}
                      />
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

        <Pagination page={page.page} pageCount={page.pageCount} perPage={page.perPage} params={params} setParams={setParams} />
      </section>

      <TxEditDialog
        caseId={caseId}
        tx={editTx}
        categories={categories}
        onClose={() => setEditTx(null)}
        onSaved={() => reload()}
        onPattern={(description, category) => openPattern({ description, category })}
      />
      <TxAddDialog caseId={caseId} base={addBase} categories={categories} onClose={() => setAddBase(null)} onAdded={reload} />
      <PatternAddDialog caseId={caseId} target={patternTarget} onClose={() => setPatternTarget(null)} />
      <ConfirmDialog open={deleteTx !== null} onClose={() => setDeleteTx(null)} onConfirm={remove} title="取引の削除" confirmLabel="削除" danger busy={busy === 'delete'}>
        この取引を削除しますか？
        {deleteTx && (
          <span className="mt-2 block rounded bg-slate-50 px-3 py-2 text-xs">
            {deleteTx.date ? warekiShort(deleteTx.date) : '日付なし'}　{deleteTx.description}　{amountCell(deleteTx, 'out') || amountCell(deleteTx, 'in')}
          </span>
        )}
      </ConfirmDialog>
      {menu && <RowContextMenu at={menu} tx={menu.tx} categories={categories} actions={menuActions} onClose={() => setMenu(null)} />}
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} categories={categories} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function SaveState({ saving, failed }: { saving: number; failed: number }) {
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

function CategoryCell({
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
function SortHeader({
  label,
  field,
  params,
  setParams,
  right,
}: {
  label: string;
  field: 'date' | 'amount_out' | 'amount_in';
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
  right?: boolean;
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
          q.delete('page');
          setParams(q);
        }}
      >
        {label}
        <Icon size={12} aria-hidden="true" />
      </button>
    </th>
  );
}

function Pagination({
  page,
  pageCount,
  perPage,
  params,
  setParams,
}: {
  page: number;
  pageCount: number;
  perPage: number;
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
}) {
  const go = (p: number) => {
    const q = new URLSearchParams(params);
    if (p <= 1) q.delete('page');
    else q.set('page', String(p));
    setParams(q);
  };
  const pages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, pageCount - 4));
    return Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  }, [page, pageCount]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      {pageCount > 1 ? (
        <nav aria-label="ページ" className="flex flex-wrap items-center gap-1">
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
      <label className="flex items-center gap-2 text-xs text-slate-600">
        表示件数
        <select
          className="input w-auto py-1"
          value={perPage}
          onChange={(e) => {
            const q = new URLSearchParams(params);
            q.set('per_page', e.target.value);
            q.delete('page');
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
    </div>
  );
}

function Empty({ filtered, onClear, onDetail }: { filtered: boolean; onClear: () => void; onDetail: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center" role="status">
      <SearchX size={32} className="text-slate-400" aria-hidden="true" />
      <p className="font-semibold">条件に一致する取引がありません</p>
      {filtered && (
        <>
          <p className="text-sm text-slate-600">キーワードを短くするか、日付・金額の範囲を広げてください。</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={onClear}>
              検索条件をすべて解除
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onDetail}>
              詳細条件を見直す
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ShortcutHelp({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: string[] }) {
  const keys: [string, string][] = [
    ['j / ↓', '次の行'],
    ['k / ↑', '前の行'],
    ['Space', '選択・解除'],
    ['e / Enter', '編集'],
    ['f', '付箋を付ける・外す'],
    ['p', 'パターン追加'],
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
        {categories.slice(0, 9).map((c, i) => (
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
