// 取込ウィザードの手順3: 1ファイル分の行を直す表（削除・下に挿入・上下の入れ替え・要確認行への移動）

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { num } from '../../lib/format';
import { accountLabel } from './AccountForm';
import type { WizardFiles } from './useWizardFiles';
import type { CheckedRow, EditFile } from './wizardRows';

const BADGE = 'inline-block rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap';

function RowStatus({ r }: { r: CheckedRow }) {
  const badges = [];
  if (r.error)
    badges.push(
      <span key="e" className={`${BADGE} bg-red-100 text-red-800`} title={r.error}>
        入力エラー
      </span>,
    );
  if (r.isBalanceError)
    badges.push(
      <span key="b" className={`${BADGE} bg-amber-100 text-amber-900`} title={`計算上の残高: ${num(r.calcBalance)}`}>
        誤差
      </span>,
    );
  if (r.dup)
    badges.push(
      <span
        key="d"
        className={`${BADGE} ${r.dup === 'high' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'}`}
        title={r.dup === 'high' ? '取込済みの取引と同じ内容です' : '取込済みの取引と日付・摘要・金額が同じです（残高が違う）'}
      >
        {r.dup === 'high' ? '重複' : '重複?'}
      </span>,
    );
  if (badges.length === 0) badges.push(<span key="ok" className={`${BADGE} bg-emerald-100 text-emerald-800`}>OK</span>);
  return <div className="flex flex-col items-start gap-0.5">{badges}</div>;
}

const CELL_INPUT = 'input px-1.5 py-1 text-sm';
const AMOUNT_COLUMNS = [
  { key: 'amountOut', label: '出金' },
  { key: 'amountIn', label: '入金' },
] as const;

type Props = {
  file: EditFile;
  rows: CheckedRow[];
  actions: Pick<WizardFiles, 'updateRow' | 'deleteRows' | 'insertBelow' | 'move'>;
};

export function PreviewTable({ file, rows, actions }: Props) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [cursor, setCursor] = useState(-1);
  const problems = useMemo(() => rows.flatMap((r, i) => (r.error || r.isBalanceError ? [i] : [])), [rows]);
  const duplicateKeys = useMemo(() => rows.filter((r) => r.dup).map((r) => r.key), [rows]);
  const rowId = (key: number) => `row-${file.key}-${key}`;

  const jump = (direction: 1 | -1) => {
    if (problems.length === 0) return;
    // 端まで行ったら反対の端へ回る（findLast は ES2023 なので使わない）
    const before = problems.filter((i) => i < cursor);
    const next =
      direction === 1 ? (problems.find((i) => i > cursor) ?? problems[0]!) : (before[before.length - 1] ?? problems[problems.length - 1]!);
    setCursor(next);
    const el = document.getElementById(rowId(rows[next]!.key));
    el?.scrollIntoView({ block: 'center' });
    el?.querySelector<HTMLInputElement>('input[type=date]')?.focus();
  };

  const toggle = (key: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.key));

  return (
    <section className="card p-4" aria-label={file.filename}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {file.filename}
          <span className="ml-2 text-sm font-normal text-slate-500">{accountLabel(file.account)}</span>
        </h3>
        <span className="text-sm text-slate-500">{num(rows.length)}行</span>
      </div>

      {file.warning && <p className="mb-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">{file.warning}</p>}
      {!file.hasBalance && (
        <p className="mb-2 rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">このファイルには残高の列がありません。残高の突き合わせはできません。</p>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-outline-danger btn-sm" disabled={selected.size === 0} onClick={() => {
          actions.deleteRows(file.key, selected);
          setSelected(new Set());
        }}>
          <Trash2 size={14} />
          選択した{selected.size > 0 ? `${selected.size}行` : '行'}を削除
        </button>
        {duplicateKeys.length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set(duplicateKeys))}>
            重複の{duplicateKeys.length}行を選ぶ
          </button>
        )}
        <span className="ml-auto flex items-center gap-1 text-sm">
          <span className={problems.length ? 'text-amber-800' : 'text-slate-500'}>要確認 {problems.length}件</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!problems.length} onClick={() => jump(-1)} aria-label="前の要確認行へ">
            <ChevronUp size={14} />
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!problems.length} onClick={() => jump(1)} aria-label="次の要確認行へ">
            <ChevronDown size={14} />
          </button>
        </span>
      </div>

      <div className="max-h-[60vh] overflow-auto rounded border border-slate-200">
        <table className="table-base text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  aria-label="すべての行を選ぶ"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)))}
                />
              </th>
              <th>状態</th>
              <th>日付</th>
              <th>摘要</th>
              {AMOUNT_COLUMNS.map((c) => (
                <th key={c.key} className="text-right">
                  {c.label}
                </th>
              ))}
              {file.hasBalance && (
                <>
                  <th className="text-right">残高</th>
                  <th className="text-right">計算上の残高</th>
                </>
              )}
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.key}
                id={rowId(r.key)}
                className={r.error ? 'bg-red-50' : r.isBalanceError ? 'bg-amber-50' : r.dup ? 'bg-slate-50 text-slate-500' : undefined}
              >
                <td>
                  <input type="checkbox" aria-label={`${i + 1}行目を選ぶ`} checked={selected.has(r.key)} onChange={() => toggle(r.key)} />
                </td>
                <td>
                  <RowStatus r={r} />
                </td>
                <td>
                  <input
                    type="date"
                    className={`${CELL_INPUT} w-36`}
                    aria-label={`${i + 1}行目の日付`}
                    value={r.date}
                    onChange={(e) => actions.updateRow(file.key, r.key, { date: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={`${CELL_INPUT} min-w-48`}
                    aria-label={`${i + 1}行目の摘要`}
                    value={r.description}
                    onChange={(e) => actions.updateRow(file.key, r.key, { description: e.target.value })}
                  />
                </td>
                {AMOUNT_COLUMNS.map((c) => (
                  <td key={c.key}>
                    <input
                      className={`${CELL_INPUT} w-28 text-right tabular-nums`}
                      inputMode="numeric"
                      aria-label={`${i + 1}行目の${c.label}`}
                      value={r[c.key]}
                      onChange={(e) => actions.updateRow(file.key, r.key, { [c.key]: e.target.value })}
                    />
                  </td>
                ))}
                {file.hasBalance && (
                  <>
                    <td>
                      <input
                        className={`${CELL_INPUT} w-32 text-right tabular-nums`}
                        inputMode="numeric"
                        aria-label={`${i + 1}行目の残高`}
                        placeholder="（空欄）"
                        value={r.balance}
                        onChange={(e) => actions.updateRow(file.key, r.key, { balance: e.target.value })}
                      />
                    </td>
                    <td className={`text-right tabular-nums ${r.isBalanceError ? 'font-semibold text-amber-900' : 'text-slate-500'}`}>
                      {r.calcBalance === null ? '' : num(r.calcBalance)}
                    </td>
                  </>
                )}
                <td>
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn btn-secondary btn-sm px-1.5" aria-label={`${i + 1}行目を上へ`} disabled={i === 0} onClick={() => actions.move(file.key, r.key, -1)}>
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm px-1.5"
                      aria-label={`${i + 1}行目を下へ`}
                      disabled={i === rows.length - 1}
                      onClick={() => actions.move(file.key, r.key, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm px-1.5" aria-label={`${i + 1}行目の下に行を足す`} onClick={() => actions.insertBelow(file.key, r.key)}>
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm px-1.5"
                      aria-label={`${i + 1}行目を削除`}
                      onClick={() => {
                        actions.deleteRows(file.key, new Set([r.key]));
                        setSelected((s) => {
                          const next = new Set(s);
                          next.delete(r.key);
                          return next;
                        });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={file.hasBalance ? 9 : 7} className="py-6 text-center text-slate-500">
                  行がありません。このファイルからは何も取り込みません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {problems.length > 0 && cursor >= 0 && rows[cursor]?.error && <p className="mt-2 text-sm text-red-700">{cursor + 1}行目: {rows[cursor]!.error}</p>}
    </section>
  );
}
