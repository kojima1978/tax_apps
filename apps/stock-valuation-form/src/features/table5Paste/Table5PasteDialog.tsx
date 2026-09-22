// 第5表の資産・負債へ貼り付けで取り込む画面。様式の外側なので no-print。
//
// 画面の本体はプレビュー。「何行取り込むか」より「どの行をなぜ取り込まなかったか」が
// 大事で、合計行や区分の見出しを黙って落とすと②の総資産価額が合わなくなったときに
// 追えなくなる。除外した行は理由付きで必ず残す。

import { useEffect, useMemo, useState } from 'react';
import { PasteTableEditor } from '@/features/pastedTable/PasteTableEditor';
import { usePastedTable } from '@/features/pastedTable/usePastedTable';
import {
  type ApplyMode,
  type BalanceSheetRow,
  type BalanceSheetSide,
  BALANCE_SHEET_FIELDS,
  extractBalanceSheetRows,
  guessBalanceSheetAssignment,
} from './parseBalanceSheet';

interface Table5PasteDialogProps {
  /** 取り込みを実行する。取り込めない理由があればその文言を返す（成功なら null）。 */
  onApply: (side: BalanceSheetSide, rows: BalanceSheetRow[], mode: ApplyMode) => string | null;
  onClose: () => void;
}

const SIDES: ReadonlyArray<{ value: BalanceSheetSide; label: string }> = [
  { value: 'a', label: '資産の部' },
  { value: 'l', label: '負債の部' },
];

const PLACEHOLDER = [
  '決算書・試算表の明細をそのまま貼り付けてください（例）',
  '',
  '現金預金\t80000\t80000',
  '売掛金\t60000\t60000',
  '土地\t150000\t50000\t土地等',
].join('\n');

type PreviewEntry = {
  line: number;
  kind: 'row' | 'skip' | 'error';
  cells: readonly string[];
  reason: string;
};

export function Table5PasteDialog({ onApply, onClose }: Table5PasteDialogProps) {
  const [side, setSide] = useState<BalanceSheetSide>('a');
  const [failure, setFailure] = useState<string | null>(null);
  const state = usePastedTable(BALANCE_SHEET_FIELDS, guessBalanceSheetAssignment);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const result = useMemo(
    () => extractBalanceSheetRows(state.table, state.assignment, side),
    [side, state.assignment, state.table],
  );

  const entries = useMemo<PreviewEntry[]>(() => {
    const noticeOf = new Map(result.notices.map((notice) => [notice.line, notice.reason]));
    return [
      ...result.rows.map((row): PreviewEntry => ({
        line: row.line,
        kind: 'row',
        cells: [row.name, row.evaluated, row.book, row.note],
        reason: noticeOf.get(row.line) ?? '',
      })),
      ...result.skipped.map((issue): PreviewEntry => ({
        line: issue.line, kind: 'skip', cells: [], reason: issue.reason,
      })),
      ...result.errors.map((issue): PreviewEntry => ({
        line: issue.line, kind: 'error', cells: [], reason: issue.reason,
      })),
    ].sort((a, b) => a.line - b.line);
  }, [result]);

  const sideLabel = side === 'a' ? '資産の部' : '負債の部';
  const canApply = result.rows.length > 0 && result.errors.length === 0;

  const apply = (mode: ApplyMode) => {
    if (mode === 'replace') {
      const message = [
        `${sideLabel}の明細をすべて消してから、${result.rows.length}行を取り込みます。`,
        '',
        '入力済みの相続税評価額・備考も消えます。よろしいですか？',
      ].join('\n');
      if (!window.confirm(message)) return;
    }
    const message = onApply(side, result.rows, mode);
    if (message === null) onClose();
    else setFailure(message);
  };

  return (
    <div className="no-print app-modal-backdrop" onClick={onClose}>
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table5-paste-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="table5-paste-title" className="check-title">第５表　資産・負債の貼り付け取込</h2>
        <p className="check-note">
          金額は<b>千円単位のまま</b>取り込みます（円からの換算はしません）。
          科目の合算・端数処理はせず、備考（株式等・土地等）も推測しません。
          合計・小計とみられる行は、②総資産価額に二重計上されるため取り込みません。
        </p>

        <div className="admin-row">
          <span className="admin-label">取込先</span>
          {SIDES.map((item) => (
            <label key={item.value} className="admin-note" style={{ marginRight: 12 }}>
              <input
                type="radio"
                name="table5-paste-side"
                checked={side === item.value}
                onChange={() => { setSide(item.value); setFailure(null); }}
              />
              {item.label}
            </label>
          ))}
        </div>

        <PasteTableEditor state={state} fields={BALANCE_SHEET_FIELDS} placeholder={PLACEHOLDER} />

        {/* 貼り付け前は列が決まっていないのが当たり前なので、その指摘は出さない。 */}
        {state.table.rows.length > 0 && entries.length > 0 && (
          <>
            <p className="admin-note">
              取り込む {result.rows.length}行／除外 {result.skipped.length}行
              {result.errors.length > 0 && <>／<b>取り込めない {result.errors.length}行</b></>}
            </p>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>行</th>
                    <th>取込</th>
                    <th>科目</th>
                    <th>相続税評価額</th>
                    <th>帳簿価額</th>
                    <th>備考</th>
                    <th>摘要</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`${entry.kind}-${entry.line}`} className={entry.kind === 'error' ? 'admin-row-deleting' : undefined}>
                      <td className="admin-num">{entry.line}</td>
                      <td>{entry.kind === 'row' ? '○' : '−'}</td>
                      <td>{entry.cells[0] ?? ''}</td>
                      <td className="admin-num">{entry.cells[1] ?? ''}</td>
                      <td className="admin-num">{entry.cells[2] ?? ''}</td>
                      <td>{entry.cells[3] ?? ''}</td>
                      <td>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {failure !== null && <p className="case-error">{failure}</p>}

        <div className="prereq-actions">
          <button
            type="button"
            className="app-tool-btn"
            disabled={!canApply}
            title={`${sideLabel}の入力済みの明細の後ろへ足します`}
            onClick={() => apply('append')}
          >
            末尾に追加する
          </button>
          <button
            type="button"
            className="app-tool-btn app-tool-btn-danger"
            disabled={!canApply}
            title={`${sideLabel}の明細をすべて消してから取り込みます`}
            onClick={() => apply('replace')}
          >
            入れ替える
          </button>
          <button type="button" className="app-tool-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
