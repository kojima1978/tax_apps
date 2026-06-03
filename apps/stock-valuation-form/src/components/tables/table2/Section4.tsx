import { NumberField } from '@/components/ui/NumberField';
import { FormField } from '@/components/ui/FormField';
import { br } from '../shared';
import type { GFn, UFn } from './types';

/* 縦書きラベル */
const vt: React.CSSProperties = {
  writingMode: 'vertical-rl',
  textOrientation: 'mixed',
  letterSpacing: '0.05em',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const inputCell: React.CSSProperties = { padding: 0, height: 17 };

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

export function Section4({ g, u }: { g: GFn; u: UFn }) {
  const judge1 = g('judgment4_1');
  const judge2 = g('judgment4_2');

  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid #000', height: '100%' }}>
      {/* 左縦ラベル「4．開業後3年未満の会社等」 */}
      <div style={{ width: 16, ...br, ...vt, background: '#f5f5f0', fontWeight: 700, fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0' }}>
        ４．開業後３年未満の会社等
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ===== (1) 開業後3年未満の会社 ===== */}
        <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7, flex: 1 }}>
          <colgroup>
            <col style={{ width: '13%' }} />{/* (1)ラベル */}
            <col style={{ width: '12%' }} />{/* 開業年月日ラベル */}
            <col style={{ width: '16%' }} />{/* 年月日入力 */}
            <col style={{ width: '9%' }} />{/* 判定基準/判定 */}
            <col style={{ width: '25%' }} />{/* 課税時期…である */}
            <col style={{ width: '25%' }} />{/* 課税時期…でない */}
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan={2} style={{ fontSize: 6.5, lineHeight: 1.3, fontWeight: 500 }}>
                （1）開 業 後 ３ 年<br />未 満 の 会 社
              </td>
              <td colSpan={2} style={{ fontWeight: 500, letterSpacing: '0.5em' }}>判定要素</td>
              <td style={{ fontWeight: 500 }}>判定基準</td>
              <td style={{ fontSize: 6.5 }}>課税時期において<br />開業後３年未満である</td>
              <td style={{ fontSize: 6.5 }}>課税時期において<br />開業後３年未満でない</td>
            </tr>
            <tr>
              <td>開業年月日</td>
              <td style={{ padding: '1px 3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                  <FormField value={g('opening_date_y')} onChange={(v) => u('opening_date_y', v)} className="w-5" textAlign="center" />
                  <span>年</span>
                  <FormField value={g('opening_date_m')} onChange={(v) => u('opening_date_m', v)} className="w-4" textAlign="center" />
                  <span>月</span>
                  <FormField value={g('opening_date_d')} onChange={(v) => u('opening_date_d', v)} className="w-4" textAlign="center" />
                  <span>日</span>
                </div>
              </td>
              <td style={{ fontWeight: 500 }}>判定</td>
              <td>
                <Toggle value="yes" selected={judge1 === 'yes'} onToggle={(v) => u('judgment4_1', v)}>該　当</Toggle>
              </td>
              <td>
                <Toggle value="no" selected={judge1 === 'no'} onToggle={(v) => u('judgment4_1', v)}>非 該 当</Toggle>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== (2) 比準要素数0の会社 ===== */}
        <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7, flex: 1 }}>
          <colgroup>
            <col style={{ width: '12%' }} />{/* (2)ラベル */}
            <col style={{ width: '7%' }} />{/* 判定要素 横 */}
            <col style={{ width: '9%' }} />{/* ⑧円 */}
            <col style={{ width: '9%' }} />{/* ⑧銭 */}
            <col style={{ width: '13%' }} />{/* ⑨ */}
            <col style={{ width: '13%' }} />{/* ⑩ */}
            <col style={{ width: '7%' }} />{/* 判定基準/判定 横 */}
            <col style={{ width: '15%' }} />{/* criteria/該当 */}
            <col style={{ width: '15%' }} />{/* 非該当 */}
          </colgroup>
          <tbody>
            {/* R1 */}
            <tr>
              <td rowSpan={4} style={{ fontSize: 6.5, lineHeight: 1.3, fontWeight: 500 }}>
                （2）比 準 要 素 数<br />０ の 会 社
              </td>
              <td rowSpan={4} style={{ fontWeight: 500, fontSize: 6.5, lineHeight: 1.3 }}>判定要素</td>
              <td colSpan={4} style={{ fontSize: 6.5 }}>直前期末を基とした判定要素</td>
              <td rowSpan={3} style={{ fontWeight: 500, fontSize: 6.5, lineHeight: 1.2 }}>判定<br />基準</td>
              <td colSpan={2} rowSpan={3} style={{ fontSize: 6.5, lineHeight: 1.6, padding: '2px 4px' }}>
                <div>直前期末を基とした判定要素がいずれも０</div>
                <div>である（該当）　・　でない（非該当）</div>
              </td>
            </tr>
            {/* R2: 第4表の⑧⑨⑩の金額（2行表示） */}
            <tr>
              <td colSpan={2} style={{ fontSize: 6, lineHeight: 1.2 }}>
                <div>第４表の</div>
                <div>B1の金額</div>
              </td>
              <td style={{ fontSize: 6, lineHeight: 1.2 }}>
                <div>第４表の</div>
                <div>C1の金額</div>
              </td>
              <td style={{ fontSize: 6, lineHeight: 1.2 }}>
                <div>第４表の</div>
                <div>D1の金額</div>
              </td>
            </tr>
            {/* R3: 円銭ラベル */}
            <tr>
              <td style={{ fontSize: 6.5 }}>円</td>
              <td style={{ fontSize: 6.5 }}>銭</td>
              <td style={{ fontSize: 6.5 }}>円</td>
              <td style={{ fontSize: 6.5 }}>円</td>
            </tr>
            {/* R4: 入力 | 判定 該当/非該当 */}
            <tr>
              <td style={inputCell}><NumberField value={g('b1_4')} onChange={(v) => u('b1_4', v)} /></td>
              <td style={inputCell}><NumberField value={g('b2_4')} onChange={(v) => u('b2_4', v)} /></td>
              <td style={inputCell}><NumberField value={g('c1_4')} onChange={(v) => u('c1_4', v)} /></td>
              <td style={inputCell}><NumberField value={g('d1_4')} onChange={(v) => u('d1_4', v)} /></td>
              <td style={{ fontWeight: 500 }}>判定</td>
              <td>
                <Toggle value="yes" selected={judge2 === 'yes'} onToggle={(v) => u('judgment4_2', v)}>該　当</Toggle>
              </td>
              <td>
                <Toggle value="no" selected={judge2 === 'no'} onToggle={(v) => u('judgment4_2', v)}>非 該 当</Toggle>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
