import { NumberField } from '@/components/ui/NumberField';
import { TableTitleBar } from './TableTitleBar';
import { bb, br, hdr, vt } from './shared';
import type { TableProps } from '@/types/form';

const T = 'table3' as const;

// ---- Data ----
const COMPANY_SIZES = [
  {
    label: <>大 会 社 の<br />株式の価額</>,
    description: (
      <>
        <div>次のうちいずれか低い方の金額（②の記載がないときは①の金額）</div>
        <div style={{ paddingLeft: 8 }}>イ　①の金額</div>
        <div style={{ paddingLeft: 8 }}>ロ　②の金額</div>
      </>
    ),
    num: '④',
    key: 'large_price',
  },
  {
    label: <>中 会 社 の<br />株式の価額</>,
    num: '⑤',
    key: 'medium_price',
    hasLRatio: true,
  },
  {
    label: <>小 会 社 の<br />株式の価額</>,
    description: (
      <>
        <div>次のうちいずれか低い方の金額</div>
        <div style={{ paddingLeft: 8 }}>イ　②の金額（③の金額があるときは③の金額）</div>
        <div style={{ paddingLeft: 8 }}>ロ（①の金額 × 0.50）＋（イの金額 × 0.50）</div>
      </>
    ),
    num: '⑥',
    key: 'small_price',
  },
] as const;

const CAPITAL_FIELDS = [
  { label: <>直前期末の<br />資本金等の額</>, num: '⑨', key: 'capital_amount', unit: '千円', flex: 1 },
  { label: <>直前期末の<br />発行済株式数</>, num: '⑩', key: 'issued_shares', unit: '株', flex: 1 },
  { label: <>直前期末の<br />自己株式数</>, num: '⑪', key: 'treasury_shares', unit: '株', flex: 1 },
  { label: <>1株当たりの資本金等<br />の額を50円とした場合<br />の発行済株式数<br />（⑨÷50円）</>, num: '⑫', key: 'shares_50yen', unit: '株', flex: 1.3 },
  { label: <>１株当たりの<br />資本金等の額<br />（⑨÷（⑩−⑪））</>, num: '⑬', key: 'capital_per_share', unit: '円', flex: 1 },
];

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

export function Table3({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form" style={{ fontSize: 8.5 }}>
      <TableTitleBar
        title="第３表　一般の評価会社の株式及び株式に関する権利の価額の計算明細書"
        fontSize={10}
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ======== ①②③ ヘッダー ======== */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
          <div style={{ width: '18%', ...br, ...hdr, padding: '3px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 7.5, lineHeight: 1.4 }}>
            1株当たりの<br />価額の計算の<br />基となる金額
          </div>
          <div style={{ flex: 1, ...br }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px', ...bb, fontSize: 7.5 }}>
              <span style={{ flex: 1 }}>類似業種比準価額（第４表の⑳、㉗又は㉘の金額）</span>
              <span style={{ marginRight: 4 }}>①</span>
              <NumberField value={g('ruiji_price')} onChange={(v) => u('ruiji_price', v)} unit="円" className="w-16" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px', fontSize: 7.5 }}>
              <span style={{ flex: 1 }}>１株当たりの純資産価額（第５表の⑪の金額）</span>
              <span style={{ marginRight: 4 }}>②</span>
              <NumberField value={g('net_asset_price')} onChange={(v) => u('net_asset_price', v)} unit="円" className="w-16" />
            </div>
          </div>
          <div style={{ width: '22%', padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 7 }}>
            <div style={{ lineHeight: 1.3 }}>１株当たりの純資産価額の80％相当額（第５表の⑫の記載がある場合のその金額）</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
              <span style={{ marginRight: 4 }}>③</span>
              <NumberField value={g('net_asset_80')} onChange={(v) => u('net_asset_80', v)} unit="円" className="w-16" />
            </div>
          </div>
        </div>

        {/* ======== セクション1: 原則的評価方式による価額 ======== */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
          <div style={{ width: 26, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', fontSize: 8 }}>
            <span style={{ marginBottom: 4, fontWeight: 700 }}>１</span>
            <span style={{ ...vt, flex: 1 }}>原則的評価方式による価額</span>
          </div>

          <div style={{ flex: 1 }}>
            <table className="gov-table" style={{ fontSize: 8, height: '100%' }}>
              <colgroup>
                <col style={{ width: 48 }} />
                <col style={{ width: 65 }} />
                <col />
                <col style={{ width: 100 }} />
              </colgroup>
              <tbody>
                {/* ヘッダー行 */}
                <tr>
                  <td className="gov-header" style={{ fontWeight: 500 }} />
                  <td className="gov-header" style={{ letterSpacing: '0.5em', fontWeight: 500 }}>区　分</td>
                  <td className="gov-header" style={{ letterSpacing: '0.3em', fontWeight: 500 }}>１株当たりの価額の算定方法</td>
                  <td className="gov-header" style={{ fontSize: 7.5, fontWeight: 500 }}>１株当たりの価額</td>
                </tr>
                {/* 大・中・小会社 */}
                {COMPANY_SIZES.map((row, i) => (
                  <tr key={row.key}>
                    {i === 0 && (
                      <td rowSpan={3} className="gov-header" style={{ ...vt, fontSize: 7, padding: '2px 1px', verticalAlign: 'middle' }}>株式の１株当たりの価額の計算</td>
                    )}
                    <td className="gov-header" style={{ fontSize: 7.5, lineHeight: 1.4 }}>{row.label}</td>
                    <td style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.4, textAlign: 'left' }}>
                      {'hasLRatio' in row && row.hasLRatio ? (
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>（①と②とのいずれか低い方の金額 × Ｌの割合　0.</span>
                          <NumberField value={g('l_ratio')} onChange={(v) => u('l_ratio', v)} className="w-8" />
                          <span>）＋（②の金額（③の金額があるときは③の金額）×（１－Ｌの割合　0.</span>
                          <NumberField value={g('l_ratio_inv')} onChange={(v) => u('l_ratio_inv', v)} className="w-8" />
                          <span>））</span>
                        </div>
                      ) : 'description' in row ? row.description : null}
                    </td>
                    <td style={{ textAlign: 'left', padding: '2px 4px' }}>
                      <div>{row.num}</div>
                      <NumberField value={g(row.key)} onChange={(v) => u(row.key, v)} unit="円" />
                    </td>
                  </tr>
                ))}
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
                    {/* ラベル行 */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                      <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>株式の価額</div>
                      <div style={{ width: 10 }} />
                      <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>割当株式１株当<br />たりの払込金額</div>
                      <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.3 }}>１株当たりの<br />割当株式数</div>
                      <div style={{ width: 20 }} />
                      <div style={{ flex: 1, textAlign: 'center', fontSize: 6, lineHeight: 1.3 }}>１株当たりの<br />割当株式数又は<br />交付株式数</div>
                    </div>
                    {/* 入力行 */}
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
              </tbody>
            </table>
          </div>
        </div>

        {/* ======== セクション2: 配当還元方式による価額 ======== */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
          <div style={{ width: 26, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', fontSize: 8 }}>
            <span style={{ marginBottom: 4, fontWeight: 700 }}>２</span>
            <span style={{ ...vt, flex: 1 }}>配当還元方式による価額</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* ⑨⑩⑪⑫⑬ */}
            <div style={{ display: 'flex', ...bb, flex: 1 }}>
              <div style={{ width: 90, ...br, ...hdr, padding: '2px 3px', fontSize: 7, textAlign: 'center', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                １株当たりの<br />資本金等の額、<br />発行済株式数等
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', ...bb, fontSize: 6.5, textAlign: 'center' }}>
                  {CAPITAL_FIELDS.map((f, i) => (
                    <div key={f.key} style={{ flex: f.flex, ...(i < CAPITAL_FIELDS.length - 1 ? br : {}), padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
                      {f.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', fontSize: 7.5 }}>
                  {CAPITAL_FIELDS.map((f, i) => (
                    <div key={f.key} style={{ flex: f.flex, ...(i < CAPITAL_FIELDS.length - 1 ? br : {}), padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 2 }}>{f.num}</span>
                      <NumberField value={g(f.key)} onChange={(v) => u(f.key, v)} />
                      <span className="whitespace-nowrap ml-0.5">{f.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 配当金額テーブル */}
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

            {/* ⑱ */}
            <div style={{ display: 'flex', ...bb, fontSize: 7.5, flex: 1 }}>
              <div style={{ width: 90, ...br, ...hdr, padding: '3px 6px', display: 'flex', alignItems: 'center', fontSize: 7, lineHeight: 1.3 }}>
                １株（50円）当たりの<br />年配当金額
              </div>
              <div style={{ flex: 1, padding: '3px 6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>年平均配当金額（⑰の金額）÷⑫の株式数＝</span>
                <span style={{ marginRight: 4, fontWeight: 500, fontSize: 8 }}>⑱</span>
                <NumberField value={g('div_per_share_yen')} onChange={(v) => u('div_per_share_yen', v)} className="w-10" />
                <span className="mx-0.5">円</span>
                <NumberField value={g('div_per_share_sen')} onChange={(v) => u('div_per_share_sen', v)} className="w-10" />
                <span className="ml-0.5">銭</span>
                <span style={{ marginLeft: 6, fontSize: 6, lineHeight: 1.3 }}>
                  【この金額が２円50銭未満の場合は２円50銭とします。】
                </span>
              </div>
            </div>

            {/* ⑲⑳ */}
            <div style={{ display: 'flex', fontSize: 7.5, flex: 1 }}>
              <div style={{ width: 90, ...br, ...hdr, padding: '3px 6px', display: 'flex', alignItems: 'center', fontSize: 7, lineHeight: 1.3 }}>
                配当還元価額
              </div>
              <div style={{ flex: 1, ...br, padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                <span style={{ fontWeight: 500, fontSize: 8 }}>⑲</span>
                <NumberField value={g('div_return_price')} onChange={(v) => u('div_return_price', v)} className="w-12" />
                <span>円</span>
              </div>
              <div style={{ width: 80, ...br, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: 8, marginRight: 2 }}>⑳</span>
                <NumberField value={g('div_return_final')} onChange={(v) => u('div_return_final', v)} className="flex-1" />
                <span className="ml-0.5">円</span>
              </div>
              <div style={{ width: 110, padding: '2px 4px', fontSize: 5.5, lineHeight: 1.3, display: 'flex', alignItems: 'center' }}>
                【⑲の金額が、原則的評価方式により計算した価額を超える場合には、原則的評価方式により計算した価額とします。】
              </div>
            </div>
          </div>
        </div>

        {/* ======== 下段: セクション3＋4 ======== */}
        <div style={{ display: 'flex' }}>

          {/* セクション3 */}
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

          {/* セクション4 */}
          <div style={{ width: '32%', display: 'flex', flexDirection: 'column', fontSize: 7.5 }}>
            <div style={{ padding: '3px 6px', fontWeight: 700, textAlign: 'center', ...bb, fontSize: 7.5 }}>
              ４．株式及び株式に関する<br />権利の価額<br />（１．及び２．に共通）
            </div>
            <div style={{ flex: 1, ...bb, display: 'flex' }}>
              <div style={{ width: '50%', ...br, padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...hdr, fontSize: 7 }}>
                株式の評価額
              </div>
              <div style={{ width: '50%', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <NumberField value={g('stock_value_1')} onChange={(v) => u('stock_value_1', v)} className="flex-1" />
                <span className="whitespace-nowrap ml-0.5">円</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
              <div style={{ width: '50%', ...br, padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...hdr, fontSize: 7, textAlign: 'center', lineHeight: 1.3 }}>
                株式に関する<br />権利の評価額
              </div>
              <div style={{ width: '50%', padding: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 7 }}>
                  <span>（</span>
                  <NumberField value={g('rights_value_yen')} onChange={(v) => u('rights_value_yen', v)} className="flex-1" />
                  <span className="mx-0.5">円</span>
                  <NumberField value={g('rights_value_sen')} onChange={(v) => u('rights_value_sen', v)} className="flex-1" />
                  <span>銭）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
