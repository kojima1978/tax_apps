import { NumberField } from '@/components/ui/NumberField';
import { hdr, vt } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2DividendTable({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 6.5, tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col />
        <col />
        <col />
        <col />
      </colgroup>
      <tbody>
        <tr style={{ height: '33.33%' }}>
          <td rowSpan={3} style={{ ...hdr, fontSize: 6.5, padding: '2px 1px', verticalAlign: 'middle', textAlign: 'center' }}>
            <span style={{ ...vt }}>直前期末以前２年間の配当金額</span>
          </td>
          <td style={{ ...hdr, padding: '1px 2px', textAlign: 'center', verticalAlign: 'middle', fontSize: 6, lineHeight: 1.2, overflow: 'hidden' }}>事業年度</td>
          <td style={{ ...hdr, padding: '1px 2px', textAlign: 'center', verticalAlign: 'middle', fontSize: 6, lineHeight: 1.2, overflow: 'hidden' }}>⑭ 年配当金額</td>
          <td style={{ ...hdr, padding: '1px 2px', textAlign: 'center', verticalAlign: 'middle', fontSize: 6, lineHeight: 1.2, overflow: 'hidden' }}>⑮ 左のうち非経常的な配当金額</td>
          <td style={{ ...hdr, padding: '1px 2px', textAlign: 'center', verticalAlign: 'middle', fontSize: 6, lineHeight: 1.2, overflow: 'hidden' }}>⑯ 差引経常的な年配当金額（⑭−⑮）</td>
          <td style={{ ...hdr, padding: '1px 2px', textAlign: 'center', verticalAlign: 'middle', fontSize: 6, lineHeight: 1.2, overflow: 'hidden' }}>年平均配当金額</td>
        </tr>
        <tr style={{ height: '33.33%', fontSize: 7.5 }}>
          <td className="gov-header" style={{ letterSpacing: '0.2em', textAlign: 'center', verticalAlign: 'middle' }}>直 前 期</td>
          <td style={{ padding: '2px 3px' }}><NumberField value={g('div_prev1')} onChange={(v) => u('div_prev1', v)} unit="千円" /></td>
          <td style={{ padding: '2px 3px' }}><NumberField value={g('div_extra1')} onChange={(v) => u('div_extra1', v)} unit="千円" /></td>
          <td style={{ padding: '2px 3px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 2 }}>イ</span>
              <NumberField value={g('div_regular1')} onChange={(v) => u('div_regular1', v)} unit="千円" />
            </div>
          </td>
          <td style={{ padding: '2px 3px', verticalAlign: 'middle', fontSize: 6, borderBottom: 'none', textAlign: 'left' }}>
            <span>⑰（イ＋ロ）÷２</span>
          </td>
        </tr>
        <tr style={{ height: '33.33%', fontSize: 7.5 }}>
          <td className="gov-header" style={{ letterSpacing: '0.1em', textAlign: 'center', verticalAlign: 'middle' }}>直前々期</td>
          <td style={{ padding: '2px 3px' }}><NumberField value={g('div_prev2')} onChange={(v) => u('div_prev2', v)} unit="千円" /></td>
          <td style={{ padding: '2px 3px' }}><NumberField value={g('div_extra2')} onChange={(v) => u('div_extra2', v)} unit="千円" /></td>
          <td style={{ padding: '2px 3px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 2 }}>ロ</span>
              <NumberField value={g('div_regular2')} onChange={(v) => u('div_regular2', v)} unit="千円" />
            </div>
          </td>
          <td style={{ padding: '2px 3px', verticalAlign: 'middle', borderTop: 'none' }}>
            <NumberField value={g('avg_dividend')} onChange={(v) => u('avg_dividend', v)} unit="千円" />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
