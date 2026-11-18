// 取込確認: AI・CSVの分類を既定で採用し、取り込まない行だけを選ぶ。
// 一覧は1取引1行。細かな修正は行の編集画面で行う。
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ConfirmDialog, Dialog } from '../../components/Dialog';
import { num, warekiShort } from '../../lib/format';
import { accountLabel } from './AccountForm';
import { EraDatePanel, type EraPanelContext } from './EraDatePanel';
import type { WizardFiles } from './useWizardFiles';
import { duplicateWarning, hasOpenIssues, type CheckedRow, type EditFile } from './wizardRows';

const PAGE_SIZE = 100;
const BADGE = 'inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap';
const ORIGIN_LABEL = { csv: 'AI・CSV', auto: '未分類', manual: '手直し' } as const;
const amount = (value: string) => {
  if (!value.trim()) return '－';
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? num(parsed) : value;
};

function RowStatus({ row }: { row: CheckedRow }) {
  if (row.excluded) return <span className={`${BADGE} bg-slate-200 text-slate-700`}>対象外</span>;
  if (row.blank) return <span className={`${BADGE} bg-slate-100 text-slate-500`}>未入力</span>;
  if (row.error) return <span className={`${BADGE} bg-red-100 text-red-800`} title={row.error}>入力エラー</span>;
  if (hasOpenIssues(row)) return <span className={`${BADGE} bg-red-100 text-red-800`} title={row.issues.join('\n')}>要確認</span>;
  if (row.isBalanceError) return <span className={`${BADGE} bg-amber-100 text-amber-900`} title={`計算上の残高: ${num(row.calcBalance)}`}>残高差</span>;
  if (row.dup) return <span className={`${BADGE} bg-slate-200 text-slate-700`} title="取込済みの取引と重複しています">重複</span>;
  if (row.accepted) return <span className={`${BADGE} bg-slate-100 text-slate-700`}>確認済み</span>;
  return <span className={`${BADGE} bg-emerald-100 text-emerald-800`}>OK</span>;
}

type Props = {
  file: EditFile;
  rows: CheckedRow[];
  actions: Pick<WizardFiles, 'updateRow' | 'acceptRow' | 'deleteRows' | 'setExcluded' | 'insertBelow' | 'move'>;
  categories?: string[];
  era?: EraPanelContext;
};

export function PreviewTable({ file, rows, actions, categories, era }: Props) {
  const [page, setPage] = useState(1);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [deleteKey, setDeleteKey] = useState<number | null>(null);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const shown = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const editing = rows.find((row) => row.key === editingKey);
  const editingIndex = editing ? rows.indexOf(editing) : -1;
  const deleting = rows.find((row) => row.key === deleteKey);
  const warning = useMemo(() => duplicateWarning(rows), [rows]);
  const reviewMode = categories !== undefined;
  const excluded = rows.filter((row) => row.excluded && !row.blank).length;
  const duplicateKeys = useMemo(() => rows.filter((row) => row.dup && !row.excluded && !row.blank).map((row) => row.key), [rows]);
  const categoryChoices = editing?.category && !categories?.includes(editing.category) ? [editing.category, ...(categories ?? [])] : categories ?? [];

  return (
    <section className="card p-4" aria-label={file.filename}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{file.filename}<span className="ml-2 text-sm font-normal text-slate-500">{accountLabel(file.account)}</span></h3>
        <span className="text-sm text-slate-600">{reviewMode ? `取込対象 ${num(rows.filter((row) => !row.blank && !row.excluded).length)}行・対象外 ${num(excluded)}行` : `${num(rows.filter((row) => !row.blank).length)}行`}</span>
      </div>
      {reviewMode && <p className="mb-2 text-sm text-slate-600">AI・CSVの分類をそのまま使います。取り込まない行だけ「対象外」にチェックしてください。修正は「編集」から行えます。</p>}
      {warning && <p className="mb-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning}</p>}
      {era && <EraDatePanel file={file} era={era} />}
      {!file.hasBalance && <p className="mb-2 rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">このファイルには残高の列がありません。残高の突き合わせはできません。</p>}
      {reviewMode && duplicateKeys.length > 0 && <button type="button" className="btn btn-secondary btn-sm mb-2" onClick={() => actions.setExcluded(file.key, new Set(duplicateKeys), true)}>重複の{duplicateKeys.length}行を対象外にする</button>}
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="table-base mx-auto min-w-[920px] max-w-[1100px] table-fixed" aria-label={`${file.filename}の取引`}>
          <colgroup>
            {reviewMode && <col className="w-16" />}<col className="w-20" /><col className="w-20" /><col />
            <col className="w-24" /><col className="w-24" />
            {file.hasBalance && <col className="w-24" />}
            {categories && <col className="w-40" />}
            <col className={reviewMode ? 'w-44' : 'w-24'} />
          </colgroup>
          <thead><tr>{reviewMode && <th>対象外</th>}<th>状態</th><th>日付</th><th>摘要</th><th className="text-right">出金</th><th className="text-right">入金</th>{file.hasBalance && <th className="text-right">残高</th>}{categories && <th>分類</th>}<th>操作</th></tr></thead>
          <tbody>
            {shown.map((row, index) => {
              const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
              return <tr key={row.key} className={row.excluded ? 'bg-slate-50 text-slate-500' : row.error || hasOpenIssues(row) ? 'bg-red-50' : row.isBalanceError ? 'bg-amber-50' : undefined}>
                {reviewMode && <td><input type="checkbox" aria-label={`${rowNumber}行目を取込対象から外す`} checked={row.excluded} disabled={row.blank} onChange={(event) => actions.setExcluded(file.key, new Set([row.key]), event.target.checked)} /></td>}
                <td><RowStatus row={row} /></td>
                <td className="whitespace-nowrap text-xs tabular-nums" title={row.date}>{row.date ? warekiShort(row.date) : row.rawDate || '－'}</td>
                <td><div className="truncate" title={row.description}>{row.description || '－'}</div></td>
                <td className="text-right whitespace-nowrap tabular-nums">{amount(row.amountOut)}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{amount(row.amountIn)}</td>
                {file.hasBalance && <td className="text-right whitespace-nowrap tabular-nums" title={row.calcBalance === null ? undefined : `計算上: ${num(row.calcBalance)}`}>{amount(row.balance)}</td>}
                {categories && <td>
                  <div className="truncate text-xs" title={`現在: ${row.category || '未分類'}${row.sourceCategory && row.sourceCategory !== row.category ? ` / 元のAI・CSV分類: ${row.sourceCategory}` : ''}`}>
                    {row.category || '未分類'}
                    {row.sourceCategory && row.sourceCategory !== row.category && <span className="ml-1 text-slate-600">（元: {row.sourceCategory}）</span>}
                  </div>
                </td>}
                <td>
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingKey(row.key)} aria-label={`${rowNumber}行目を編集`}>編集</button>
                    {reviewMode && (row.category ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => actions.updateRow(file.key, row.key, { category: '' })} aria-label={`${rowNumber}行目を未分類にする`}>未分類</button>
                    ) : row.sourceCategory && categories?.includes(row.sourceCategory) ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => actions.updateRow(file.key, row.key, { category: row.sourceCategory! })} aria-label={`${rowNumber}行目を元のAI・CSV分類「${row.sourceCategory}」に戻す`}>元に戻す</button>
                    ) : (
                      <button type="button" className="btn btn-secondary btn-sm" disabled>未分類</button>
                    ))}
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDeleteKey(row.key)} aria-label={`${rowNumber}行目を削除`}>削除</button>
                  </div>
                </td>
              </tr>;
            })}
            {rows.length === 0 && <tr><td colSpan={6 + (reviewMode ? 1 : 0) + (file.hasBalance ? 1 : 0) + (categories ? 1 : 0)} className="py-6 text-center text-slate-500">行がありません。</td></tr>}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && <nav className="mt-3 flex items-center justify-end gap-2 text-sm" aria-label={`${file.filename}のページ切り替え`}><span>{num(currentPage)} / {num(pageCount)}ページ</span><button type="button" className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={14} aria-hidden="true" />前へ</button><button type="button" className="btn btn-secondary btn-sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>次へ<ChevronRight size={14} aria-hidden="true" /></button></nav>}
      <Dialog open={!!editing} onClose={() => setEditingKey(null)} title={`${editingIndex + 1}行目を編集`} size="lg" footer={<button type="button" className="btn btn-primary" onClick={() => setEditingKey(null)}>閉じる</button>}>
        {editing && <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>日付<input type="date" className="input mt-1" value={editing.date} onChange={(event) => actions.updateRow(file.key, editing.key, { date: event.target.value })} /></label>
            <label>摘要<input className="input mt-1" value={editing.description} onChange={(event) => actions.updateRow(file.key, editing.key, { description: event.target.value })} /></label>
            <label>出金<input className="input mt-1" inputMode="numeric" value={editing.amountOut} onChange={(event) => actions.updateRow(file.key, editing.key, { amountOut: event.target.value })} /></label>
            <label>入金<input className="input mt-1" inputMode="numeric" value={editing.amountIn} onChange={(event) => actions.updateRow(file.key, editing.key, { amountIn: event.target.value })} /></label>
            {file.hasBalance && <label>残高<input className="input mt-1" inputMode="numeric" value={editing.balance} onChange={(event) => actions.updateRow(file.key, editing.key, { balance: event.target.value })} /></label>}
            {categories && <label>分類<select className="input mt-1" value={editing.category} onChange={(event) => actions.updateRow(file.key, editing.key, { category: event.target.value })}><option value="">未分類</option>{categoryChoices.map((category) => <option key={category} value={category}>{category}</option>)}</select><span className="mt-1 block text-xs text-slate-500">現在: {ORIGIN_LABEL[editing.categoryOrigin]}{editing.sourceCategory && `・元のAI・CSV分類: ${editing.sourceCategory}`}{editing.autoCategory && editing.autoCategory !== editing.category ? `・アプリ候補: ${editing.autoCategory}` : ''}</span></label>}
            {file.hasMemo && <label>メモ<input className="input mt-1" value={editing.memo} onChange={(event) => actions.updateRow(file.key, editing.key, { memo: event.target.value })} /></label>}
            {file.hasFlag && <label className="flex items-center gap-2"><input type="checkbox" checked={editing.flagged} onChange={(event) => actions.updateRow(file.key, editing.key, { flagged: event.target.checked })} />付箋を付ける</label>}
          </div>
          {editing.rawDate && !editing.date && <p className="text-red-700">ファイルの日付: {editing.rawDate}</p>}
          {editing.flagUnreadable && <p className="text-amber-800">「要確認」の読めない値: {editing.flagUnreadable}</p>}
          {editing.error && <p role="alert" className="text-red-700">{editing.error}</p>}
          {hasOpenIssues(editing) && <div className="rounded bg-red-50 p-3 text-red-800"><p>{editing.issues.join(' / ')}</p><button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => actions.acceptRow(file.key, editing.key)}><Check size={14} aria-hidden="true" />このままでよい</button></div>}
          {editing.isBalanceError && <p className="text-amber-800">計算上の残高: {num(editing.calcBalance)}</p>}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            <button type="button" className="btn btn-secondary btn-sm" disabled={editingIndex === 0} onClick={() => actions.move(file.key, editing.key, -1)}><ArrowUp size={14} aria-hidden="true" />上へ</button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={editingIndex === rows.length - 1} onClick={() => actions.move(file.key, editing.key, 1)}><ArrowDown size={14} aria-hidden="true" />下へ</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => actions.insertBelow(file.key, editing.key)}><Plus size={14} aria-hidden="true" />下に行を追加</button>
          </div>
        </div>}
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleteKey(null)}
        onConfirm={() => {
          if (deleteKey !== null) actions.deleteRows(file.key, new Set([deleteKey]));
          setDeleteKey(null);
        }}
        title="行を削除"
        confirmLabel="削除する"
        danger
      >
        「{deleting?.description || '未入力の行'}」を確認画面から削除します。{reviewMode && '取り込まないだけなら「対象外」を選んでください。'}
      </ConfirmDialog>
    </section>
  );
}
