/**
 * 用紙と用紙のあいだに置く操作帯（続紙の追加・削除）。
 *
 * 続紙の操作を様式の上端ツールバーに置くと、明細の末尾を埋めたところから遠く離れた場所へ
 * 視線と手を戻すことになり、削除ボタンは消す対象の続紙から画面1枚分離れてしまう。
 * 用紙の境目に置けば、下へスクロールする自然な流れの先に追加が現れ、削除は対象の直上に来る。
 *
 * 様式の中には重ねないので印刷への影響はない（no-print）。見た目は main.css の .sheet-ops、
 * 帯を挟んだことで外れる用紙間の改ページは .sheet-ops + .gov-page が引き受ける。
 */

const BTN_STYLE = {
  fontSize: 11, lineHeight: 1.4, padding: '0 6px', border: '1px solid #888', borderRadius: 3,
  background: '#fff', color: '#111', cursor: 'pointer',
} as const;

type SheetOpsProps = {
  /** 帯の説明文（例: 「続紙1（株主6〜18名）」） */
  label: string;
  /** 操作ボタン。省略すると説明だけの帯になる */
  action?: { text: string; title?: string; onClick: () => void };
};

export function SheetOps({ label, action }: SheetOpsProps) {
  return (
    <div className="sheet-ops no-print">
      <span>{label}</span>
      {action && (
        <button type="button" onClick={action.onClick} title={action.title ?? action.text} style={BTN_STYLE}>
          {action.text}
        </button>
      )}
    </div>
  );
}
