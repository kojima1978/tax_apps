import { useEffect, useMemo, useState } from 'react';
import { consistencyIssues, hasCheckableInput } from '@/lib/consistencyChecks';
import type { TableId, TableProps } from '@/types/form';

interface ConsistencyCheckerProps {
  getField: TableProps['getField'];
  /** 一覧の行をクリックしたときの移動先（表＋欄） */
  onJump: (tab: TableId, field: string) => void;
}

/**
 * 入力値どうしの食い違いを「確認事項」として出す。
 * 入力を止めない（エラー扱いにしない）のは、様式どおりの記載でも成り立つ組み合わせがあるため。
 */
export function ConsistencyChecker({ getField, onJump }: ConsistencyCheckerProps) {
  const [open, setOpen] = useState(false);
  const issues = useMemo(() => consistencyIssues(getField), [getField]);
  const checkable = useMemo(() => hasCheckableInput(getField), [getField]);

  // 直せば一覧は空になる。開いたままにしておく意味がないので閉じる
  useEffect(() => { if (issues.length === 0) setOpen(false); }, [issues.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (issues.length === 0) {
    return checkable ? <span className="app-required-done">整合チェック 問題なし</span> : null;
  }

  return (
    <>
      <button
        type="button"
        className="app-tool-btn app-tool-btn-check"
        onClick={() => setOpen(true)}
        title="入力値どうしの食い違いを一覧します。計算は止めません"
      >
        確認事項 {issues.length}件
      </button>

      {open && (
        <div className="no-print app-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="app-modal check-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="check-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="check-title" className="check-title">確認事項 {issues.length}件</h2>
            <p className="check-note">
              入力値どうしの食い違いです。エラーではないので計算は続きます。様式どおりの記載であればそのままで構いません。
            </p>
            <ul className="check-list">
              {issues.map((issue) => (
                <li key={`${issue.tab}.${issue.field}:${issue.message}`}>
                  <button
                    type="button"
                    className="check-item"
                    onClick={() => { setOpen(false); onJump(issue.tab, issue.field); }}
                  >
                    <span className="check-item-where">{issue.where}</span>
                    <span className="check-item-message">{issue.message}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="prereq-actions">
              <button type="button" className="app-tool-btn" onClick={() => setOpen(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
