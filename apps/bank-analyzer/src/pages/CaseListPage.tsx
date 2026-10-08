// 案件一覧（Django: case-list / case-create / case-update / case-delete）。
// 作成・名前の変更・削除は別画面ではなくこの画面のダイアログで行う

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileUp, FolderOpen, HelpCircle, Inbox, Pencil, Plus, Search, Trash2, DatabaseBackup } from 'lucide-react';
import { ConfirmDialog, Dialog } from '../components/Dialog';
import { Menu } from '../components/Menu';
import { useNotice } from '../components/Notice';
import { useApiData } from '../hooks/useApiData';
import { api, errorMessage } from '../lib/api';
import { num, warekiFromDateTime } from '../lib/format';
import type { CaseSummary } from '../types';

const SORTS = [
  { value: 'newest', label: '新しい順', compare: (a: CaseSummary, b: CaseSummary) => b.createdAt.localeCompare(a.createdAt) },
  { value: 'oldest', label: '古い順', compare: (a: CaseSummary, b: CaseSummary) => a.createdAt.localeCompare(b.createdAt) },
  { value: 'name', label: '名前順', compare: (a: CaseSummary, b: CaseSummary) => a.name.localeCompare(b.name, 'ja') },
  { value: 'unclassified', label: '未分類多い順', compare: (a: CaseSummary, b: CaseSummary) => b.unclassifiedCount - a.unclassifiedCount },
] as const;
type SortValue = (typeof SORTS)[number]['value'];

function CaseStatus({ c }: { c: CaseSummary }) {
  if (c.unclassifiedCount > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        <HelpCircle size={14} />
        未分類 {num(c.unclassifiedCount)}
      </span>
    );
  if (c.transactionCount > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
        <CheckCircle2 size={14} />
        分類完了
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <Inbox size={14} />
      未取込
    </span>
  );
}

// 作成と名前の変更で同じダイアログを使う
function CaseNameDialog({ target, onClose, onSaved }: { target: CaseSummary | 'new' | null; onClose: () => void; onSaved: (id: number, created: boolean) => void }) {
  const notice = useNotice();
  const isNew = target === 'new';
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<typeof target>(null);
  // 開くたびに入力欄を対象の名前に戻す
  if (target !== openedFor) {
    setOpenedFor(target);
    setName(target && target !== 'new' ? target.name : '');
    setError(null);
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        const res = await api.post<{ case: { id: number }; message: string }>('/cases', { name });
        notice.success(res.message);
        onSaved(res.case.id, true);
      } else if (target) {
        await api.patch(`/cases/${target.id}`, { name });
        notice.success('案件を更新しました。');
        onSaved(target.id, false);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={isNew ? '新規案件作成' : '案件名の編集'}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" form="case-name-form" className="btn btn-primary" disabled={busy}>
            {isNew ? '作成する' : '更新する'}
          </button>
        </>
      }
    >
      <form
        id="case-name-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="label" htmlFor="case-name">
          案件名
        </label>
        <input id="case-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </form>
    </Dialog>
  );
}

export function CaseListPage() {
  const navigate = useNavigate();
  const notice = useNotice();
  const [params, setParams] = useSearchParams();
  const { data: cases, error, loading, reload } = useApiData('cases', () => api.get<CaseSummary[]>('/cases'));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortValue>('newest');
  const [editing, setEditing] = useState<CaseSummary | null>(null);
  const [deleting, setDeleting] = useState<CaseSummary | null>(null);
  const [busy, setBusy] = useState(false);

  // ヘッダーの「新規案件」は ?new=1 で来る（どの画面からでも同じ口で開けるように）
  const creating = params.get('new') === '1';
  const closeCreate = () => setParams({}, { replace: true });

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ja');
    const compare = SORTS.find((s) => s.value === sort)!.compare;
    return (cases ?? []).filter((c) => c.name.toLocaleLowerCase('ja').includes(q)).sort(compare);
  }, [cases, query, sort]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await api.delete<{ message: string }>(`/cases/${deleting.id}`);
      notice.success(res.message);
      setDeleting(null);
      reload();
    } catch (e) {
      notice.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">相続税通帳分析システム</h1>
        <p className="text-sm text-slate-500">案件を作成 → CSVを取り込む → 分析・分類</p>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">案件一覧</h2>
          <div className="flex gap-2">
            <Link to="/import-json" className="btn btn-secondary">
              <DatabaseBackup size={16} />
              JSONから復元
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setParams({ new: '1' })}>
              <Plus size={16} />
              新規案件作成
            </button>
          </div>
        </div>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {loading && !cases && <p className="py-8 text-center text-slate-500">読み込み中…</p>}

        {cases && cases.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            <FolderOpen size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="mb-4">まだ案件がありません。</p>
            <p className="text-xs">案件を作成後、CSVファイルから通帳データを取り込めます</p>
          </div>
        )}

        {cases && cases.length > 0 && (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              <div className="relative w-full max-w-xs">
                <Search size={16} className="pointer-events-none absolute top-2 left-2.5 text-slate-400" />
                <input
                  type="search"
                  className="input pl-8"
                  placeholder="案件名で検索..."
                  aria-label="案件名で検索"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select className="input w-auto" aria-label="案件の並び順" value={sort} onChange={(e) => setSort(e.target.value as SortValue)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mb-3 text-xs text-slate-500" role="status">
              {query.trim() ? `検索結果: ${visible.length}件` : `${visible.length}件の案件を表示中`}
            </p>

            {visible.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <p className="font-semibold">該当する案件はありません</p>
                <p className="text-xs">検索語を変更してお試しください。</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base" aria-label="案件一覧">
                  <thead>
                    <tr>
                      <th>案件名</th>
                      <th>分類状況</th>
                      <th className="text-right">取引</th>
                      <th className="hidden text-right md:table-cell">口座</th>
                      <th className="hidden md:table-cell">作成日</th>
                      <th className="hidden lg:table-cell">更新日</th>
                      <th className="text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td>
                          <Link to={`/cases/${c.id}`} className="flex items-center gap-2 font-semibold text-blue-800 hover:underline">
                            <FolderOpen size={18} className="shrink-0 text-blue-500" />
                            {c.name}
                          </Link>
                        </td>
                        <td>
                          <CaseStatus c={c} />
                        </td>
                        <td className="text-right tabular-nums">
                          {num(c.transactionCount)}
                          <small className="ml-0.5 text-slate-500">件</small>
                        </td>
                        <td className="hidden text-right tabular-nums md:table-cell">
                          {num(c.accountCount)}
                          <small className="ml-0.5 text-slate-500">口座</small>
                        </td>
                        <td className="hidden md:table-cell">{warekiFromDateTime(c.createdAt)}</td>
                        <td className="hidden lg:table-cell">{warekiFromDateTime(c.updatedAt)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <Menu label={`${c.name}のその他の操作`}>
                              {(close) => (
                                <>
                                  <Link to={`/cases/${c.id}/import`} className="menu-item" role="menuitem">
                                    <FileUp size={16} />
                                    CSVを取り込む
                                  </Link>
                                  <button
                                    type="button"
                                    className="menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      close();
                                      setEditing(c);
                                    }}
                                  >
                                    <Pencil size={16} />
                                    案件名を編集
                                  </button>
                                  <hr className="my-1 border-slate-200" />
                                  <button
                                    type="button"
                                    className="menu-item text-red-700"
                                    role="menuitem"
                                    onClick={() => {
                                      close();
                                      setDeleting(c);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                    案件を削除
                                  </button>
                                </>
                              )}
                            </Menu>
                            <Link to={`/cases/${c.id}`} className="btn btn-primary btn-sm">
                              <ArrowRight size={14} />
                              開く
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <CaseNameDialog
        target={creating ? 'new' : editing}
        onClose={() => (creating ? closeCreate() : setEditing(null))}
        onSaved={(id, created) => {
          if (created) navigate(`/cases/${id}/import`);
          else {
            setEditing(null);
            reload();
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="案件の削除"
        confirmLabel="削除する"
        danger
        busy={busy}
      >
        <p className="font-semibold">案件「{deleting?.name}」を削除しますか？</p>
        <p className="mt-2 text-slate-600">この操作は元に戻せません。この案件に関連する全ての取引データも同時に削除されます。</p>
      </ConfirmDialog>
    </div>
  );
}
