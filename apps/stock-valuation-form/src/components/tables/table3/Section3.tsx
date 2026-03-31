import { NumberField } from '@/components/ui/NumberField';
import { hdr, vt } from '../shared';
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
    <table className="gov-table" style={{ flex: 1, fontSize: 7 }}>
      <tbody>
        {SEC3_TITLES.map((t, i) => {
          const input = SEC3_INPUTS[i]!;
          return (
            <tr key={t.label}>
              {i === 0 && (
                <td rowSpan={4} style={{ width: '5%', ...hdr, padding: '2px 1px', fontSize: 6.5, textAlign: 'center' }}>
                  <div style={{ ...vt, display: 'flex', gap: 1 }}>
                    <span>３　株式に関する権利の価額</span>
                    <span style={{ paddingTop: 12 }}>（１及び２に共通）</span>
                  </div>
                </td>
              )}
              <td style={{ width: '15%', ...hdr, padding: '2px 3px', ...(t.small ? { fontSize: 6.5, lineHeight: 1.3 } : {}) }}>
                {t.label}
              </td>
              <td style={{ padding: '2px 4px', fontSize: 6.5 }}>
                {i === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
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
                )}
                {i === 1 && (
                  <div style={{ fontSize: 6.5 }}>
                    <div>⑧（配当還元方式の場合は⑳）の金額　ー　割当株式１株当たりの払込金額</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 1 }}>
                      <NumberField value={g('allot_payin')} onChange={(v) => u('allot_payin', v)} className="w-12" />
                      <span className="ml-0.5">円</span>
                    </div>
                  </div>
                )}
                {i === 2 && (
                  <div style={{ fontSize: 6, lineHeight: 1.3 }}>
                    <div>⑧（配当還元方式の場合は⑳）の金額</div>
                    <div>（原則時期後にこの株主となる権利につき払い込むべき金額があるときは、その金額を控除した金額）</div>
                  </div>
                )}
                {i === 3 && (
                  <div style={{ fontSize: 6.5 }}>
                    ⑧（配当還元方式の場合は⑳）の金額
                  </div>
                )}
              </td>
              <td style={{ width: '18%', padding: '2px 2px', fontSize: 7 }}>
                {input.hasSen ? (
                  <div style={{ display: 'flex' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingRight: 2 }}>
                      <span style={{ fontWeight: 500, marginRight: 1 }}>{input.num}</span>
                      <NumberField value={g(input.key)} onChange={(v) => u(input.key, v)} className="flex-1" />
                      <span className="ml-0.5">円</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 2 }}>
                      <NumberField value={g(`${input.key}_sen`)} onChange={(v) => u(`${input.key}_sen`, v)} className="flex-1" />
                      <span className="ml-0.5">銭</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, marginRight: 1 }}>{input.num}</span>
                    <NumberField value={g(input.key)} onChange={(v) => u(input.key, v)} className="flex-1" />
                    <span className="ml-0.5">円</span>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
