import { NumberField } from '@/components/ui/NumberField';
import { hdr } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2DividendReturn({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 7.5 }}>
      <tbody>
        <tr>
          <td style={{ width: '15%', ...hdr, padding: '3px 6px', fontSize: 7, lineHeight: 1.3 }}>
            配当還元価額
          </td>
          <td style={{ padding: '3px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: '0 4px', fontSize: 7 }}>⑱の金額</div>
                <div style={{ borderTop: '0.5px solid #000', padding: '0 4px', fontSize: 7 }}>10%</div>
              </div>
              <span>×</span>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: '0 4px', fontSize: 7 }}>⑬の金額</div>
                <div style={{ borderTop: '0.5px solid #000', padding: '0 4px', fontSize: 7 }}>50円</div>
              </div>
              <span>=</span>
            </div>
          </td>
          <td style={{ padding: '3px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: 8, marginRight: 2 }}>⑲</span>
              <NumberField value={g('div_return_price')} onChange={(v) => u('div_return_price', v)} className="flex-1" />
              <span className="ml-0.5">円</span>
            </div>
          </td>
          <td style={{ width: '13%', padding: '3px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: 8, marginRight: 2 }}>⑳</span>
              <NumberField value={g('div_return_final')} onChange={(v) => u('div_return_final', v)} className="flex-1" />
              <span className="ml-0.5">円</span>
            </div>
          </td>
          <td style={{ width: '18%', padding: '2px 4px', fontSize: 5.5, lineHeight: 1.3 }}>
            【⑲の金額が、原則的評価方式により計算した価額を超える場合には、原則的評価方式により計算した価額とします。】
          </td>
        </tr>
      </tbody>
    </table>
  );
}
