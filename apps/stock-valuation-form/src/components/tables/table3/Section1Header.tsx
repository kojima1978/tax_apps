import { NumberField } from '@/components/ui/NumberField';
import { hdr, vt } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section1Header({ g, u }: Props) {
  return (
    <>
      {/* Header行1: 説明 */}
      <tr>
        <td rowSpan={8} style={{ ...hdr, padding: 0, verticalAlign: 'middle', width: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px', height: '100%' }}>
            <span style={{ fontWeight: 700, marginBottom: 4, fontSize: 8 }}>１</span>
            <span style={{ ...vt, fontSize: 7 }}>原則的評価方式による価額</span>
          </div>
        </td>
        <td colSpan={2} rowSpan={2} style={{ ...hdr, padding: '3px 4px', textAlign: 'center', lineHeight: 1.4, fontSize: 7.5 }}>
          1株当たりの<br />価額の計算の<br />基となる金額
        </td>
        <td style={{ ...hdr, padding: '2px 4px', lineHeight: 1.3, fontSize: 7.5 }}>
          類似業種比準価額（第４表の⑳、㉗又は㉘の金額）
        </td>
        <td style={{ ...hdr, padding: '2px 4px', lineHeight: 1.3, fontSize: 7.5 }}>
          １株当たりの純資産価額（第５表の⑪の金額）
        </td>
        <td style={{ ...hdr, padding: '2px 4px', fontSize: 7, lineHeight: 1.3 }}>
          １株当たりの純資産価額の80％相当額（第５表の⑫の記載がある場合のその金額）
        </td>
      </tr>
      {/* Header行2: 入力 */}
      <tr>
        <td style={{ padding: '2px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ marginRight: 4 }}>①</span>
            <NumberField value={g('ruiji_price')} onChange={(v) => u('ruiji_price', v)} unit="円" className="w-16" />
          </div>
        </td>
        <td style={{ padding: '2px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ marginRight: 4 }}>②</span>
            <NumberField value={g('net_asset_price')} onChange={(v) => u('net_asset_price', v)} unit="円" className="w-16" />
          </div>
        </td>
        <td style={{ padding: '2px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ marginRight: 4 }}>③</span>
            <NumberField value={g('net_asset_80')} onChange={(v) => u('net_asset_80', v)} unit="円" className="w-16" />
          </div>
        </td>
      </tr>
      {/* 区分ヘッダー行 */}
      <tr>
        <td rowSpan={4} style={{ ...hdr, padding: 0, verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2px 1px' }}>
            <span style={{ ...vt, fontSize: 7 }}>株式の１株当たりの価額の計算</span>
          </div>
        </td>
        <td className="gov-header" style={{ letterSpacing: '0.5em', fontWeight: 500 }}>区　分</td>
        <td colSpan={2} className="gov-header" style={{ letterSpacing: '0.3em', fontWeight: 500 }}>１株当たりの価額の算定方法</td>
        <td className="gov-header" style={{ fontSize: 7.5, fontWeight: 500 }}>１株当たりの価額</td>
      </tr>
    </>
  );
}
