/**
 * 第２表の判定と表の使い分けを、様式の外側（タイトル行の右）に出す注意書き。
 *
 * 第3表（一般の評価会社）と第6表（特定の評価会社）は、どちらか一方だけを使う。
 * どちらも入力に関係なく最後まで計算して表示するので、該当しない側を開いていても
 * 画面には完成した金額が並び、「この表は使わない」ことが表のどこにも出ていなかった。
 * タブの「対象」バッジは対象の表に付くだけで、非対象の表を開いている人には見えない。
 *
 * 様式そのものには手を入れず（印刷物は原本のまま）、画面だけの注記にする。
 */
export function FormScopeNotice({ text, tone }: { text: string; tone: 'warn' | 'info' }) {
  const color = tone === 'warn'
    ? { border: '#d97706', background: '#fffbeb', text: '#78350f' }
    : { border: '#0369a1', background: '#f0f9ff', text: '#0c4a6e' };
  return (
    <span
      className="no-print"
      role="note"
      style={{
        marginLeft: 6, padding: '1px 5px',
        border: `1px solid ${color.border}`, background: color.background, color: color.text,
        fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}
