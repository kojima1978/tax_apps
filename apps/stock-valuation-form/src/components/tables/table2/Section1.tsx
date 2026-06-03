import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { GFn, UFn } from './types';

/* 縦書きラベル */
const vt: React.CSSProperties = {
  writingMode: 'vertical-rl',
  textOrientation: 'mixed',
  letterSpacing: '0.05em',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const COLUMNS = [
  { letter: 'B', key: 'b', hasSen: true },
  { letter: 'C', key: 'c', hasSen: false },
  { letter: 'D', key: 'd', hasSen: false },
];

export function Section1({ g, u }: { g: GFn; u: UFn }) {
  const judge = g('judgment1');

  return (
    <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7, height: '100%' }}>
      <colgroup>
        <col style={{ width: '90px' }} />{/* 左ラベル */}
        {/* 期1: B円 B銭 C D */}
        <col style={{ width: '6.5%' }} />
        <col style={{ width: '6.5%' }} />
        <col style={{ width: '9.5%' }} />
        <col style={{ width: '9.5%' }} />
        {/* 期2: B円 B銭 C D */}
        <col style={{ width: '6.5%' }} />
        <col style={{ width: '6.5%' }} />
        <col style={{ width: '9.5%' }} />
        <col style={{ width: '9.5%' }} />
        {/* 右: 縦ラベル / 該当 / 非該当 */}
        <col style={{ width: '16px' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '13%' }} />
      </colgroup>
      <tbody>
        {/* R1: 左ラベル | 判定要素 | 判定基準 | 基準テキスト */}
        <tr>
          <td rowSpan={4} style={{ textAlign: 'left', fontWeight: 700, fontSize: 7.5, verticalAlign: 'middle' }}>
            １．比準要素数１の会社
          </td>
          <td colSpan={8} style={{ fontWeight: 500, letterSpacing: '1.5em' }}>判　定　要　素</td>
          <td rowSpan={3} style={{ ...vt, background: '#fff' }}>判定基準</td>
          <td colSpan={2} rowSpan={3} style={{ textAlign: 'left', fontSize: 6.5, lineHeight: 1.4, padding: '2px 3px' }}>
            <CircledNumber n={1} />欄のいずれか２の判定要素が０であり、かつ、<CircledNumber n={2} />欄のいずれか２以上の判定要素が０である（該当）・でない（非該当）
          </td>
        </tr>

        {/* R2: 期タイトル */}
        <tr>
          <td colSpan={4}>（1）直前期末を基とした判定要素</td>
          <td colSpan={4}>（2）直前々期末を基とした判定要素</td>
        </tr>

        {/* R3: 列名（第４表のX?の金額） */}
        <tr>
          {(['1', '2'] as const).map((period) =>
            COLUMNS.map((col) => (
              <td key={`${col.letter}${period}`} colSpan={col.hasSen ? 2 : 1} style={{ fontSize: 6, lineHeight: 1.2 }}>
                <div>第４表の</div>
                <div>{col.letter}{period}の金額</div>
              </td>
            ))
          )}
        </tr>

        {/* R4: 円/銭ラベル + 入力欄（同一セル内・間に罫線なし） | 判定 | 該当 | 非該当 */}
        <tr>
          {(['1', '2'] as const).map((period) =>
            COLUMNS.map((col) =>
              col.hasSen ? (
                [
                  <td key={`${col.key}${period}y`} style={{ padding: 0, verticalAlign: 'top' }}>
                    <div style={{ fontSize: 6.5, textAlign: 'right', paddingRight: 2 }}>円</div>
                    <div style={{ height: 16 }}><NumberField value={g(`${col.key}_yen_${period}`)} onChange={(v) => u(`${col.key}_yen_${period}`, v)} /></div>
                  </td>,
                  <td key={`${col.key}${period}s`} style={{ padding: 0, verticalAlign: 'top' }}>
                    <div style={{ fontSize: 6.5, textAlign: 'right', paddingRight: 2 }}>銭</div>
                    <div style={{ height: 16 }}><NumberField value={g(`${col.key}_sen_${period}`)} onChange={(v) => u(`${col.key}_sen_${period}`, v)} /></div>
                  </td>,
                ]
              ) : (
                <td key={`${col.key}${period}y`} style={{ padding: 0, verticalAlign: 'top' }}>
                  <div style={{ fontSize: 6.5, textAlign: 'right', paddingRight: 2 }}>円</div>
                  <div style={{ height: 16 }}><NumberField value={g(`${col.key}_yen_${period}`)} onChange={(v) => u(`${col.key}_yen_${period}`, v)} /></div>
                </td>
              )
            )
          )}
          <td style={{ ...vt }}>判定</td>
          <td style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => u('judgment1', judge === 'yes' ? '' : 'yes')}>
            <span style={{ position: 'relative', display: 'inline-block' }}>該　当{judge === 'yes' && <span style={{ position: 'absolute', inset: -3, border: '2px solid #c00', borderRadius: '50%', pointerEvents: 'none' }} />}</span>
          </td>
          <td style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => u('judgment1', judge === 'no' ? '' : 'no')}>
            <span style={{ position: 'relative', display: 'inline-block' }}>非 該 当{judge === 'no' && <span style={{ position: 'absolute', inset: -3, border: '2px solid #c00', borderRadius: '50%', pointerEvents: 'none' }} />}</span>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
