import { NumberField } from '@/components/ui/NumberField';
import { bb, br, hdr, vt } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2DividendTable({ g, u }: Props) {
  return (
    <div style={{ display: 'flex', ...bb, flex: 1 }}>
      <div style={{ width: 40, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...vt, fontSize: 6.5, padding: '2px 1px' }}>直前期末以前２年間の配当金額</span>
      </div>
      <table className="gov-table" style={{ fontSize: 6.5 }}>
        <thead>
          <tr>
            <th style={{ width: 50, padding: '1px 2px' }}>事業年度</th>
            <th style={{ padding: '1px 2px' }}>⑭　年配当金額</th>
            <th style={{ padding: '1px 2px', lineHeight: 1.3 }}>⑮　左のうち非経常的な<br />配当金額</th>
            <th style={{ padding: '1px 2px', lineHeight: 1.3 }}>⑯　差引経常的な年配当金額<br />（⑭ − ⑮）</th>
            <th style={{ padding: '1px 2px' }}>年平均配当金額</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: 7.5 }}>
          <tr>
            <td className="gov-header" style={{ letterSpacing: '0.2em' }}>直 前 期</td>
            <td style={{ padding: '2px 3px' }}><NumberField value={g('div_prev1')} onChange={(v) => u('div_prev1', v)} unit="千円" /></td>
            <td style={{ padding: '2px 3px' }}><NumberField value={g('div_extra1')} onChange={(v) => u('div_extra1', v)} unit="千円" /></td>
            <td style={{ padding: '2px 3px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 2 }}>イ</span>
                <NumberField value={g('div_regular1')} onChange={(v) => u('div_regular1', v)} unit="千円" />
              </div>
            </td>
            <td rowSpan={2} style={{ padding: '2px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
              <div style={{ fontSize: 6.5 }}>⑰　（イ＋ロ）÷２</div>
              <NumberField value={g('avg_dividend')} onChange={(v) => u('avg_dividend', v)} unit="千円" />
            </td>
          </tr>
          <tr>
            <td className="gov-header" style={{ letterSpacing: '0.1em' }}>直前々期</td>
            <td style={{ padding: '2px 3px' }}><NumberField value={g('div_prev2')} onChange={(v) => u('div_prev2', v)} unit="千円" /></td>
            <td style={{ padding: '2px 3px' }}><NumberField value={g('div_extra2')} onChange={(v) => u('div_extra2', v)} unit="千円" /></td>
            <td style={{ padding: '2px 3px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 2 }}>ロ</span>
                <NumberField value={g('div_regular2')} onChange={(v) => u('div_regular2', v)} unit="千円" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
