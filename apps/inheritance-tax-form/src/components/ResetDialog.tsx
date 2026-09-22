import { useEffect, useRef } from 'react';

interface ResetDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

/** 申告データ全体を消去する前に、対象範囲を明示して確認する。 */
export function ResetDialog({ onCancel, onConfirm }: ResetDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="reset-dialog no-print" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description">
      <div className="reset-dialog__box">
        <div className="reset-dialog__head">
          <strong id="reset-dialog-title">申告データをクリア</strong>
        </div>
        <div className="reset-dialog__body" id="reset-dialog-description">
          <p className="reset-dialog__scope"><strong>対象範囲：すべての申告データ</strong></p>
          <ul>
            <li>被相続人・財産を取得した人の情報</li>
            <li>財産、債務、控除など各様式の入力内容</li>
            <li>使用する様式の選択と自動計算結果</li>
          </ul>
          <p className="reset-dialog__excluded">様式一覧の開閉状態と、保存済みのデータファイルは削除されません。</p>
          <p className="reset-dialog__warning">この操作は取り消せません。必要な場合は先に「データを保存」してください。</p>
        </div>
        <div className="reset-dialog__foot">
          <button ref={cancelRef} type="button" className="app-btn" onClick={onCancel}>キャンセル</button>
          <button type="button" className="app-btn app-btn--danger-solid" onClick={onConfirm}>すべての申告データをクリア</button>
        </div>
      </div>
    </div>
  );
}
