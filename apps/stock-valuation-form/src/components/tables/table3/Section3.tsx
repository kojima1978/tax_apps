import { NumberField } from '@/components/ui/NumberField';
import { bb, br, hdr, vt } from '../shared';
import type { GFn, UFn } from '../shared';

const SEC3_TITLES = [
  { label: '配当期待権', bb: true },
  { label: '株式の割当てを受ける権利（割当株式１株当たりの金額）', bb: true, small: true },
  { label: '株主となる権利（割当株式１株当たりの金額）', bb: true, small: true },
  { label: '株式無償交付期待権（交付される株式１株当たりの金額）', bb: false, small: true },
];

const SEC3_INPUTS: Array<{ num: string; key: string; hasSen?: boolean }> = [
  { num: '㉑', key: 'expected_dividend', hasSen: true },
  { num: '㉒', key: 'right_allotment' },
  { num: '㉓', key: 'right_shareholder' },
  { num: '㉔', key: 'right_free_allot' },
];

interface Props {
  g: GFn;
  u: UFn;
}

export function Section3({ g, u }: Props) {
  return (
    <div style={{ flex: 1, ...br, display: 'flex' }}>
      <div style={{ width: 26, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px 1px', fontSize: 7 }}>
        <div style={{ ...vt, fontSize: 6.5, textAlign: 'center', display: 'flex', gap: 1 }}>
          <span>３　株式に関する権利の価額</span>
          <span style={{ paddingTop: 12 }}>（１及び２に共通）</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', fontSize: 7 }}>
        {/* タイトル列 */}
        <div style={{ width: 80, ...br, display: 'flex', flexDirection: 'column' }}>
          {SEC3_TITLES.map((t) => (
            <div key={t.label} style={{ flex: 1, ...(t.bb ? bb : {}), ...hdr, padding: '2px 3px', display: 'flex', alignItems: 'center', ...(t.small ? { fontSize: 6.5, lineHeight: 1.3 } : {}) }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* 内容列 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* ㉑ */}
          <div style={{ ...bb, padding: '2px 4px', flex: 1, display: 'flex', alignItems: 'center', fontSize: 6.5 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <div>１株当たりの</div>
                <div>予想配当金額</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>（</span>
                  <NumberField value={g('div_expect_yen')} onChange={(v) => u('div_expect_yen', v)} className="w-6" />
                  <span>円</span>
                  <NumberField value={g('div_expect_sen')} onChange={(v) => u('div_expect_sen', v)} className="w-6" />
                  <span>銭）</span>
                </div>
              </div>
              <span style={{ fontSize: 10 }}>ー</span>
              <div style={{ textAlign: 'center' }}>
                <div>源泉徴収されるべき</div>
                <div>所得税相当額</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>（</span>
                  <NumberField value={g('tax_deduct_yen')} onChange={(v) => u('tax_deduct_yen', v)} className="w-6" />
                  <span>円</span>
                  <NumberField value={g('tax_deduct_sen')} onChange={(v) => u('tax_deduct_sen', v)} className="w-6" />
                  <span>銭）</span>
                </div>
              </div>
            </div>
          </div>
          {/* ㉒ */}
          <div style={{ ...bb, padding: '2px 4px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 6.5 }}>
            <div>⑧（配当還元方式の場合は⑳）の金額　ー　割当株式１株当たりの払込金額</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 1 }}>
              <NumberField value={g('allot_payin')} onChange={(v) => u('allot_payin', v)} className="w-12" />
              <span className="ml-0.5">円</span>
            </div>
          </div>
          {/* ㉓ */}
          <div style={{ ...bb, padding: '2px 4px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 6, lineHeight: 1.3 }}>
            <div>⑧（配当還元方式の場合は⑳）の金額</div>
            <div>（原則時期後にこの株主となる権利につき払い込むべき金額があるときは、その金額を控除した金額）</div>
          </div>
          {/* ㉔ */}
          <div style={{ padding: '2px 4px', flex: 1, display: 'flex', alignItems: 'center', fontSize: 6.5 }}>
            ⑧（配当還元方式の場合は⑳）の金額
          </div>
        </div>

        {/* ㉑㉒㉓㉔ 入力列 */}
        <div style={{ width: 90, ...br as object, display: 'flex', flexDirection: 'column' }}>
          {SEC3_INPUTS.map((item, i) => (
            <div key={item.key} style={{ flex: 1, ...(i < SEC3_INPUTS.length - 1 ? bb : {}), padding: '2px 2px', display: 'flex', alignItems: item.hasSen ? 'stretch' : 'center', fontSize: 7, borderLeft: '0.5px solid #000' }}>
              {item.hasSen ? (
                <div style={{ display: 'flex', flex: 1 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', ...(br as object) }}>
                    <span style={{ fontWeight: 500, marginRight: 1 }}>{item.num}</span>
                    <NumberField value={g(item.key)} onChange={(v) => u(item.key, v)} className="flex-1" />
                    <span className="ml-0.5">円</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 2 }}>
                    <NumberField value={g(`${item.key}_sen`)} onChange={(v) => u(`${item.key}_sen`, v)} className="flex-1" />
                    <span className="ml-0.5">銭</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <span style={{ fontWeight: 500, marginRight: 1 }}>{item.num}</span>
                  <NumberField value={g(item.key)} onChange={(v) => u(item.key, v)} className="flex-1" />
                  <span className="ml-0.5">円</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
