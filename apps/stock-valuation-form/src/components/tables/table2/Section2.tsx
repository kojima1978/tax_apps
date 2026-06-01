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

const inputCell: React.CSSProperties = { padding: '1px 3px' };

/** 該当・非該当トグル（クリックで赤丸） */
function Toggle({ value, selected, onToggle, children }: {
  value: string; selected: boolean; onToggle: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <span
      onClick={() => onToggle(selected ? '' : value)}
      style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', userSelect: 'none' }}
    >
      {children}
      {selected && (
        <span style={{ position: 'absolute', inset: -3, border: '2px solid #c00', borderRadius: '50%', pointerEvents: 'none' }} />
      )}
    </span>
  );
}

export function Section2({ g, u }: { g: GFn; u: UFn }) {
  const judge = g('judgment2');

  return (
    <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7 }}>
      <colgroup>
        <col style={{ width: '90px' }} />{/* 左ラベル */}
        <col style={{ width: '21%' }} />{/* 1: 総資産価額 */}
        <col style={{ width: '23%' }} />{/* 2: 株式等価額 */}
        <col style={{ width: '16%' }} />{/* 3: 保有割合 */}
        <col style={{ width: '16px' }} />{/* 4: 判定基準/判定 縦 */}
        <col style={{ width: '12%' }} />{/* 5: ③50%以上 / 該当 */}
        <col style={{ width: '12%' }} />{/* 6: ③50%未満 / 非該当 */}
      </colgroup>
      <tbody>
        {/* R1: 左ラベル | 判定要素（1〜6列 全幅） */}
        <tr>
          <td rowSpan={3} style={{ textAlign: 'left', fontWeight: 700, fontSize: 7.5, verticalAlign: 'middle' }}>
            ２．株式等保有特定会社
          </td>
          <td colSpan={6} style={{ fontWeight: 500, letterSpacing: '1em' }}>判　定　要　素</td>
        </tr>

        {/* R2: 値ヘッダー | 判定基準(縦) | 基準テキスト */}
        <tr>
          <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
            <div>総 資 産 価 額</div>
            <div>（第５表の<CircledNumber n={1} />の金額）</div>
          </td>
          <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
            <div>株式等の価額の合計額</div>
            <div>（第５表の<CircledNumber n={4} />の金額）</div>
          </td>
          <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
            <div>株式等保有割合</div>
            <div>（<CircledNumber n={2} />／<CircledNumber n={1} />）</div>
          </td>
          <td style={{ ...vt }}>判定基準</td>
          <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
            <CircledNumber n={3} />の割合が<br />50％以上である
          </td>
          <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
            <CircledNumber n={3} />の割合が<br />50％未満である
          </td>
        </tr>

        {/* R3: 入力行 | 判定(縦) | 該当 | 非該当 */}
        <tr>
          <td style={inputCell}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CircledNumber n={1} />
              <NumberField value={g('total_assets_2')} onChange={(v) => u('total_assets_2', v)} />
              <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
            </div>
          </td>
          <td style={inputCell}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CircledNumber n={2} />
              <NumberField value={g('stock_value_2')} onChange={(v) => u('stock_value_2', v)} />
              <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
            </div>
          </td>
          <td style={inputCell}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CircledNumber n={3} />
              <NumberField value={g('stock_ratio_2')} onChange={(v) => u('stock_ratio_2', v)} />
              <span style={{ marginLeft: 1 }}>％</span>
            </div>
          </td>
          <td style={{ ...vt }}>判定</td>
          <td>
            <Toggle value="yes" selected={judge === 'yes'} onToggle={(v) => u('judgment2', v)}>該　当</Toggle>
          </td>
          <td>
            <Toggle value="no" selected={judge === 'no'} onToggle={(v) => u('judgment2', v)}>非 該 当</Toggle>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
