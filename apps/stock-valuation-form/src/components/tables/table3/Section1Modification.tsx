import { NumberField } from '@/components/ui/NumberField';
import { vt } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section1Modification({ g, u }: Props) {
  return (
    <>
      {/* ⑦ 修正: 配当期待権 */}
      <tr>
        <td rowSpan={2} className="gov-header" style={{ ...vt, fontSize: 7, padding: '2px 1px', verticalAlign: 'middle' }}>株式の価額の修正</td>
        <td style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.5, textAlign: 'left' }}>
          <div>課税時期において</div>
          <div>配当期待権の発生</div>
          <div>している場合</div>
        </td>
        <td style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.5, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>株式の価額（④、⑤又は⑥の金額）ー１株当たりの配当金額</span>
            <NumberField value={g('div_expect_price_yen')} onChange={(v) => u('div_expect_price_yen', v)} className="w-8" />
            <span className="mx-0.5">円</span>
            <NumberField value={g('div_expect_price_sen')} onChange={(v) => u('div_expect_price_sen', v)} className="w-8" />
            <span className="ml-0.5">銭</span>
          </div>
        </td>
        <td style={{ textAlign: 'left', padding: 0, fontSize: 7 }}>
          <div style={{ padding: '2px 4px', borderBottom: '0.5px solid #000' }}>修正後の株式の価額</div>
          <div style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 8, marginRight: 2 }}>⑦</span>
            <NumberField value={g('modified_price_7')} onChange={(v) => u('modified_price_7', v)} className="flex-1" />
            <span className="ml-0.5">円</span>
          </div>
        </td>
      </tr>
      {/* ⑧ 修正: 割当て等 */}
      <tr>
        <td style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.3, textAlign: 'left' }}>
          課税時期において株式の割当てを受ける権利、株主となる権利又は株式無償交付期待権の発生している場合
        </td>
        <td style={{ padding: '2px 4px', fontSize: 6.5 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>株式の価額</div>
            <div style={{ width: 10 }} />
            <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>割当株式１株当<br />たりの払込金額</div>
            <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>１株当たりの<br />割当株式数</div>
            <div style={{ width: 20 }} />
            <div style={{ flex: 1, textAlign: 'center', fontSize: 6, lineHeight: 1.3 }}>１株当たりの<br />割当株式数又は<br />交付株式数</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
            <div style={{ flex: 1, fontSize: 6, lineHeight: 1.3, textAlign: 'center' }}>
              （④、⑤又は⑥<br />(⑦があるときは⑦)<br />の金額）
            </div>
            <span style={{ fontSize: 9 }}>×</span>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <NumberField value={g('allot_price')} onChange={(v) => u('allot_price', v)} />
              <div style={{ fontSize: 7 }}>円</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <NumberField value={g('allot_shares')} onChange={(v) => u('allot_shares', v)} />
              <div style={{ fontSize: 7 }}>株</div>
            </div>
            <span style={{ fontSize: 9 }}>×</span>
            <span style={{ fontSize: 9 }}>÷</span>
            <div style={{ flex: 1, fontSize: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>（1株＋</span>
                <NumberField value={g('allotment_ratio')} onChange={(v) => u('allotment_ratio', v)} className="flex-1" />
              </div>
              <div style={{ textAlign: 'right' }}>株）</div>
            </div>
          </div>
        </td>
        <td style={{ textAlign: 'left', padding: 0, fontSize: 7 }}>
          <div style={{ padding: '2px 4px', borderBottom: '0.5px solid #000' }}>修正後の株式の価額</div>
          <div style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 8, marginRight: 2 }}>⑧</span>
            <NumberField value={g('modified_price_8')} onChange={(v) => u('modified_price_8', v)} className="flex-1" />
            <span className="ml-0.5">円</span>
          </div>
        </td>
      </tr>
    </>
  );
}
