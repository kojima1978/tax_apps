// 質問候補タブ（Django: _tab_flagged.html と analysis_transactions.js の付箋まわり）。
// 付箋を付けた取引の一覧・摘要のキーワード検索・並び替え・質問メモ・付箋を外す・CSV。
//
// Django 版との違い（直したもの）:
// - 質問メモは一覧に出るだけで、書くには行ごとに編集画面を開く必要があった。一覧の欄で直接書ける
//   （Enter で保存・Shift+Enter で改行・Esc で取り消し）
// - CSV はキーワードで絞り込んでいる最中でも全件を日付順で出していた。画面と同じキーワード・並びで出す
//   （services/exports.ts）

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookmarkX, CircleHelp, Download, Pencil, Search } from 'lucide-react';
import { DownloadButton } from '../../components/DownloadButton';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api, errorMessage } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import { SortHeader } from './tableParts';
import { PatternAddDialog, TxEditDialog, type PatternTarget } from './TxDialogs';
import { AccountCell, RefDateBadge, amountCell } from './txParts';
import type { DashboardSummary, TabData, TxRow } from './types';

type Props = { dash: DashboardSummary & TabData['flagged']; reload: () => void };

export function FlaggedTab({ dash, reload }: Props) {
  const caseId = dash.case.id;
  const notice = useNotice();
  const { busy, run } = useAction();
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') ?? '';

  const [rows, setRows] = useState<TxRow[]>(dash.flaggedTxs);
  const [lastRows, setLastRows] = useState(dash.flaggedTxs);
  if (lastRows !== dash.flaggedTxs) {
    setLastRows(dash.flaggedTxs);
    setRows(dash.flaggedTxs);
  }
  const [editTx, setEditTx] = useState<TxRow | null>(null);
  const [patternTarget, setPatternTarget] = useState<PatternTarget | null>(null);

  const unflag = async (tx: TxRow) => {
    const res = await run(`flag-${tx.id}`, () => api.post<{ isFlagged: boolean }>(`/cases/${caseId}/transactions/${tx.id}/flag`));
    if (!res) return;
    if (res.isFlagged) {
      // 別の画面で外されていた（押したことで付け直した）
      notice.success('質問候補に戻しました');
    } else {
      setRows((rs) => rs.filter((r) => r.id !== tx.id));
      notice.success('質問候補から外しました');
    }
    reload();
  };

  const saveMemo = async (tx: TxRow, memo: string) => {
    const res = await api.put<{ memo: string }>(`/cases/${caseId}/transactions/${tx.id}/memo`, { memo });
    setRows((rs) => rs.map((r) => (r.id === tx.id ? { ...r, memo: res.memo } : r)));
  };

  const csvParams = new URLSearchParams();
  for (const k of ['keyword', 'sort'] as const) {
    const v = params.get(k);
    if (v) csvParams.set(k, v);
  }

  return (
    <section className="card p-4" aria-labelledby="flaggedTitle">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="flaggedTitle" className="flex items-center gap-1 font-bold">
          <CircleHelp size={16} aria-hidden="true" />
          質問候補（{num(rows.length)}件）
        </h2>
        {keyword && <span className="text-xs text-slate-500">「{keyword}」で絞り込み中</span>}
        {rows.length > 0 && (
          <DownloadButton path={`/cases/${caseId}/export/csv/flagged`} params={csvParams} className="btn btn-secondary btn-sm ml-auto" title="表示中の取引を書き出します">
            <Download size={14} aria-hidden="true" />
            CSV
          </DownloadButton>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">
        不明点のある取引を集め、お客様への質問をメモに残します。取引一覧の行のメニュー（または F キー）から追加できます。
      </p>

      <KeywordSearch params={params} setParams={setParams} />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {keyword ? '条件に合う質問候補はありません' : '質問候補はまだありません。取引一覧で不明な取引を質問候補に追加してください'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr>
                <SortHeader label="日付" field="date" params={params} setParams={setParams} />
                <th>口座</th>
                <th>摘要</th>
                <SortHeader label="出金" field="amount_out" params={params} setParams={setParams} right />
                <SortHeader label="入金" field="amount_in" params={params} setParams={setParams} right />
                <th>分類</th>
                <th className="min-w-64">質問メモ</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="whitespace-nowrap">
                    {warekiShort(t.date)}
                    <RefDateBadge date={t.date} referenceDate={dash.case.referenceDate} />
                  </td>
                  <td>
                    <AccountCell t={t} />
                  </td>
                  <td className="max-w-64">
                    <span className="block truncate" title={t.description}>
                      {t.description || '-'}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap tabular-nums text-red-700">{amountCell(t, 'out')}</td>
                  <td className="text-right whitespace-nowrap tabular-nums text-emerald-700">{amountCell(t, 'in')}</td>
                  <td>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs whitespace-nowrap">{t.category || '-'}</span>
                  </td>
                  <td>
                    <MemoCell tx={t} onSave={saveMemo} />
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditTx(t)} aria-label={`ID ${t.id} を編集`} title="編集">
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => unflag(t)}
                        disabled={busy !== null}
                        aria-label={`ID ${t.id} を質問候補から外す`}
                        title="質問候補から外す"
                      >
                        <BookmarkX size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TxEditDialog
        caseId={caseId}
        tx={editTx}
        categories={dash.options.categories}
        onClose={() => setEditTx(null)}
        onSaved={() => reload()}
        onPattern={(description, category) => setPatternTarget({ description, category })}
      />
      <PatternAddDialog caseId={caseId} target={patternTarget} onClose={() => setPatternTarget(null)} />
    </section>
  );
}

// 摘要のキーワード（空白区切りはすべて含む）。条件は URL に持つ
function KeywordSearch({ params, setParams }: { params: URLSearchParams; setParams: ReturnType<typeof useSearchParams>[1] }) {
  const applied = params.get('keyword') ?? '';
  const [draft, setDraft] = useState(applied);
  const [last, setLast] = useState(applied);
  if (last !== applied) {
    setLast(applied);
    setDraft(applied);
  }
  const apply = (value: string) => {
    const q = new URLSearchParams(params);
    if (value.trim()) q.set('keyword', value.trim());
    else q.delete('keyword');
    setParams(q);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    apply(draft);
  };
  return (
    <form onSubmit={submit} className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          className="input w-64 py-1 pl-7"
          placeholder="摘要をキーワード検索"
          aria-label="摘要のキーワード"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm">
        検索
      </button>
      {applied && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply('')}>
          クリア
        </button>
      )}
    </form>
  );
}

// 質問メモ。押すと書ける。Enter で保存・Shift+Enter で改行・Esc で取り消し・欄の外へ出ると保存
function MemoCell({ tx, onSave }: { tx: TxRow; onSave: (tx: TxRow, memo: string) => Promise<void> }) {
  const notice = useNotice();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tx.memo);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const open = () => {
    setDraft(tx.memo);
    setEditing(true);
  };
  const commit = async () => {
    if (saving) return;
    if (draft.trim() === tx.memo.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(tx, draft.trim());
      setEditing(false);
    } catch (e) {
      notice.error(`メモを保存できませんでした: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="input min-h-16 w-full text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => void commit()}
        disabled={saving}
        aria-label={`ID ${tx.id} の質問メモ`}
      />
    );
  }
  return (
    <button
      type="button"
      className="block w-full rounded px-1 py-0.5 text-left text-sm whitespace-pre-wrap hover:bg-slate-100"
      onClick={open}
      title="押すとメモを書けます"
    >
      {tx.memo || <span className="text-xs text-slate-400">未記入（押して書く）</span>}
    </button>
  );
}
