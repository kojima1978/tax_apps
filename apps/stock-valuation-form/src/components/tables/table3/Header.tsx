import { NumberField } from '@/components/ui/NumberField';
import { hdr } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Header({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 7.5, borderBottom: '1.5px solid #000' }}>
      <tbody>
        <tr>
          <td rowSpan={2} style={{ ...hdr, padding: '3px 4px', textAlign: 'center', lineHeight: 1.4, width: '15%' }}>
            1株当たりの<br />価額の計算の<br />基となる金額
          </td>
          <td style={{ ...hdr, padding: '2px 4px', lineHeight: 1.3 }}>
            類似業種比準価額（第４表の⑳、㉗又は㉘の金額）
          </td>
          <td style={{ ...hdr, padding: '2px 4px', lineHeight: 1.3 }}>
            １株当たりの純資産価額（第５表の⑪の金額）
          </td>
          <td style={{ ...hdr, padding: '2px 4px', fontSize: 7, lineHeight: 1.3 }}>
            １株当たりの純資産価額の80％相当額（第５表の⑫の記載がある場合のその金額）
          </td>
        </tr>
        <tr>
          <td style={{ padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span style={{ marginRight: 4 }}>①</span>
              <NumberField value={g('ruiji_price')} onChange={(v) => u('ruiji_price', v)} unit="円" className="w-16" />
            </div>
          </td>
          <td style={{ padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span style={{ marginRight: 4 }}>②</span>
              <NumberField value={g('net_asset_price')} onChange={(v) => u('net_asset_price', v)} unit="円" className="w-16" />
            </div>
          </td>
          <td style={{ padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span style={{ marginRight: 4 }}>③</span>
              <NumberField value={g('net_asset_80')} onChange={(v) => u('net_asset_80', v)} unit="円" className="w-16" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
