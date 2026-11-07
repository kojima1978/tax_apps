import { useEffect, useMemo, useState } from 'react';
import type { FormData, TableId } from '@/types/form';
import { type ReviewKind, type ReviewRow, hasIntakeMarks, reviewRows } from '@/lib/intake';
import { useFieldCatalog } from '@/hooks/useFieldCatalog';

interface IntakeReviewPanelProps {
  formData: FormData;
  /** 一覧の行から欄へ飛ぶ（name 属性をそのまま渡す。欄が決まらない行は表だけ開く） */
  onGo: (tab: TableId, name: string | null) => void;
  /** 控えを「確認済み」にする（印は消え、出典は残る） */
  onConfirm: (keys: readonly string[]) => void;
}

const GROUPS: readonly { kind: ReviewKind; heading: string; note: string }[] = [
  {
    kind: 'uncertain',
    heading: '自信なしとされた欄',
    note: '読み取った側が「資料から読み切れなかった」としています。資料を見て直してください',
  },
  {
    kind: 'auto',
    heading: '自動で入った欄（未確認）',
    note: '出典の資料と見比べて、合っていれば「確認済み」にしてください',
  },
  {
    kind: 'required',
    heading: '未入力の必須欄',
    note: '空のままだと株価が出ません',
  },
  {
    kind: 'manual',
    heading: '人が入れる欄',
    note: '資料からは決まらないので、自動では入りません',
  },
];

/**
 * 取込の確認。
 *
 * 外部ツール（PDF から読み取って入れる経路）が入れた欄と、人が確認・入力する欄を一覧にする。
 * 控えが1件も無い案件（手で打っただけの案件）では何も出さない ── 必須欄の数え上げは
 * ふだんは RequiredFieldNavigator の役目で、ここはあくまで取込の後始末の画面。
 */
export function IntakeReviewPanel({ formData, onGo, onConfirm }: IntakeReviewPanelProps) {
  const [open, setOpen] = useState(false);
  const catalog = useFieldCatalog();
  const marked = hasIntakeMarks(formData);
  const rows = useMemo(
    () => (marked ? reviewRows(catalog, formData) : []),
    [catalog, formData, marked],
  );

  useEffect(() => { if (!marked) setOpen(false); }, [marked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!marked) return null;
  if (rows.length === 0) {
    return <span className="app-required-done">取込の確認 済み</span>;
  }

  const confirmable = rows
    .map((row) => row.intakeKey)
    .filter((key): key is string => key !== undefined);

  const go = (row: ReviewRow) => {
    setOpen(false);
    onGo(row.tab, row.name);
  };

  return (
    <>
      <button
        type="button"
        className="app-tool-btn app-tool-btn-intake"
        onClick={() => setOpen(true)}
        title="PDFなどから自動で入った欄と、人が確認・入力する欄を一覧します"
      >
        取込の確認 {rows.length}件
      </button>

      {open && (
        <div className="no-print app-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="app-modal intake-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intake-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="intake-title" className="check-title">取込の確認 {rows.length}件</h2>
            <p className="check-note">
              自動で入った欄には画面だけに紫（自信なしは赤）の印が付きます。印刷には出ません。
              値を直すか「確認済み」にすると印は消えます。
            </p>
            {catalog === null && (
              <p className="check-note">欄の辞書を読み込めませんでした。欄名は保存キーのまま出しています。</p>
            )}

            {GROUPS.map((group) => {
              const items = rows.filter((row) => row.kind === group.kind);
              if (items.length === 0) return null;
              return (
                <section key={group.kind} className="intake-group">
                  <h3 className="intake-group-title">{group.heading} {items.length}件</h3>
                  <p className="intake-group-note">{group.note}</p>
                  <ul className="check-list">
                    {items.map((row) => {
                      const key = row.intakeKey;
                      return (
                        <li key={row.id} className="intake-row">
                          <button
                            type="button"
                            className={`check-item intake-item intake-item-${row.kind}`}
                            onClick={() => go(row)}
                          >
                            <span className="check-item-where">{row.title}</span>
                            <span className="check-item-message">{row.detail}</span>
                          </button>
                          {key !== undefined && (
                            <button
                              type="button"
                              className="app-tool-btn intake-confirm"
                              onClick={() => onConfirm([key])}
                              title="出典は残したまま、画面の印だけ消します"
                            >
                              確認済み
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <div className="prereq-actions intake-actions">
              {confirmable.length > 0 && (
                <button
                  type="button"
                  className="app-tool-btn"
                  onClick={() => onConfirm(confirmable)}
                  title="一覧に出ている自動入力の欄すべての印を消します（出典は残ります）"
                >
                  自動入力をすべて確認済みにする（{confirmable.length}件）
                </button>
              )}
              <button type="button" className="app-tool-btn" onClick={() => setOpen(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
