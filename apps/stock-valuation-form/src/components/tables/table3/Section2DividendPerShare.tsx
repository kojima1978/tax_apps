import { NumberField } from '@/components/ui/NumberField';
import { hdr } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2DividendPerShare({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 7.5 }}>
      <tbody>
        <tr>
          <td style={{ width: '15%', ...hdr, padding: '3px 6px', fontSize: 7, lineHeight: 1.3 }}>
            １株（50円）当たりの<br />年配当金額
          </td>
          <td style={{ padding: '3px 6px' }}>
            年平均配当金額（⑰の金額）÷⑫の株式数＝
          </td>
          <td style={{ padding: '3px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: 8, marginRight: 2 }}>⑱</span>
              <NumberField value={g('div_per_share_yen')} onChange={(v) => u('div_per_share_yen', v)} className="w-10" />
              <span className="mx-0.5">円</span>
              <NumberField value={g('div_per_share_sen')} onChange={(v) => u('div_per_share_sen', v)} className="w-10" />
              <span className="ml-0.5">銭</span>
            </div>
          </td>
          <td style={{ padding: '2px 4px', fontSize: 6, lineHeight: 1.3 }}>
            【この金額が２円50銭未満の場合は２円50銭とします。】
          </td>
        </tr>
      </tbody>
    </table>
  );
}
