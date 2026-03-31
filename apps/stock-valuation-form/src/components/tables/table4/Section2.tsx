import { NumberField } from '@/components/ui/NumberField';
import { Computed } from '@/components/ui/Computed';
import { hdr, vt, parseNum } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

/** ２　比準要素等の金額の計算 */
export function Table4Section2({ g, u }: Props) {
  // ---- 自動計算 ----
  const calcDivReg = (yr: string) => g(`div_${yr}`) !== '' ? parseNum(g(`div_${yr}`)) - parseNum(g(`div_extra_${yr}`)) : null;
  const divRegY1 = calcDivReg('y1');
  const divRegY2 = calcDivReg('y2');
  const divRegY3 = calcDivReg('y3');
  const avgDiv = divRegY1 !== null && divRegY2 !== null ? Math.round((divRegY1 + divRegY2) / 2) : null;
  const avgDiv10 = divRegY2 !== null && divRegY3 !== null ? Math.round((divRegY2 + divRegY3) / 2) : null;

  const calcProfit = (yr: string) => g(`income_${yr}`) !== '' ? parseNum(g(`income_${yr}`)) - parseNum(g(`extra_profit_${yr}`)) - parseNum(g(`div_exclusion_${yr}`)) + parseNum(g(`tax_${yr}`)) + parseNum(g(`loss_deduct_${yr}`)) : null;
  const profitY1 = calcProfit('y1');
  const profitY2 = calcProfit('y2');
  const profitY3 = calcProfit('y3');

  const calcAsset = (yr: string) => (g(`cap_${yr}`) !== '' || g(`retained_${yr}`) !== '') ? parseNum(g(`cap_${yr}`)) + parseNum(g(`retained_${yr}`)) : null;
  const assetY1 = calcAsset('y1');
  const assetY2 = calcAsset('y2');

  const th6: React.CSSProperties = { fontSize: 6, lineHeight: 1.2 };
  const th55: React.CSSProperties = { fontSize: 5.5, lineHeight: 1.2 };

  return (
    <table className="gov-table" style={{ fontSize: 6.5, borderBottom: '1.5px solid #000' }}>
      <colgroup>
        <col style={{ width: '4%' }} />
        <col style={{ width: '7%' }} />
        <col />
      </colgroup>
      <tbody>
        {/* ---- 2a: 配当金額 ---- */}
        <tr>
          <td rowSpan={3} style={{ ...hdr, padding: '2px 1px', fontSize: 7, textAlign: 'center', verticalAlign: 'middle' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ marginBottom: 2, fontWeight: 700 }}>２</span>
              <span style={{ ...vt, fontSize: 7 }}>比準要素等の金額の計算</span>
            </div>
          </td>
          <td style={{ ...hdr, padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle' }}>
            <span style={{ ...vt, fontSize: 6 }}>1株(50円)当たりの<br />年平均配当金額</span>
          </td>
          <td style={{ padding: 0 }}>
            <DividendTable g={g} u={u} divRegY1={divRegY1} divRegY2={divRegY2} divRegY3={divRegY3} avgDiv={avgDiv} avgDiv10={avgDiv10} />
          </td>
        </tr>

        {/* ---- 2b: 利益金額 ---- */}
        <tr>
          <td style={{ ...hdr, padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle' }}>
            <span style={{ ...vt, fontSize: 6 }}>1株(50円)当たりの<br />年利益金額等</span>
          </td>
          <td style={{ padding: 0 }}>
            <ProfitTable g={g} u={u} profitY1={profitY1} profitY2={profitY2} profitY3={profitY3} th55={th55} th6={th6} />
          </td>
        </tr>

        {/* ---- 2c: 純資産価額 ---- */}
        <tr>
          <td style={{ ...hdr, padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle' }}>
            <span style={{ ...vt, fontSize: 6 }}>1株(50円)当たりの<br />純資産価額の<br />金額の計算</span>
          </td>
          <td style={{ padding: 0 }}>
            <AssetTable g={g} u={u} assetY1={assetY1} assetY2={assetY2} th6={th6} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ---- 配当金額テーブル ---- */
function DividendTable({ g, u, divRegY1, divRegY2, divRegY3, avgDiv, avgDiv10 }: {
  g: GFn; u: UFn;
  divRegY1: number | null; divRegY2: number | null; divRegY3: number | null;
  avgDiv: number | null; avgDiv10: number | null;
}) {
  const th6: React.CSSProperties = { fontSize: 6, lineHeight: 1.2 };
  return (
    <table className="gov-table" style={{ fontSize: 6.5, tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '10%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '30%' }} />
      </colgroup>
      <tbody>
        {/* Header row 1 */}
        <tr>
          <td colSpan={5} style={{ ...hdr, textAlign: 'center' }}>直前期末以前２（３）年間の年平均配当金額</td>
          <td rowSpan={2} style={{ ...hdr, ...th6, lineHeight: 1.3, textAlign: 'center' }}>
            比準要素数１の会社、比準要素数０の会社の<br />判定要素の金額
          </td>
        </tr>
        {/* Header row 2 */}
        <tr>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>事業年度</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑥年配当<br />金額</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑦左のうち非経常<br />的な配当金額</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑧差引経常的な年<br />配当金額(⑥−⑦)</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>年平均<br />配当金額</td>
        </tr>
        {/* 直前期 */}
        <tr>
          <td style={{ ...hdr, textAlign: 'center' }}>直 前 期</td>
          <td><NumberField value={g('div_y1')} onChange={(v) => u('div_y1', v)} unit="千円" /></td>
          <td><NumberField value={g('div_extra_y1')} onChange={(v) => u('div_extra_y1', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 6, marginRight: 2 }}>イ</span>
              <Computed value={divRegY1} unit="千円" />
            </div>
          </td>
          <td rowSpan={3} style={{ padding: 0, fontSize: 6, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, padding: '2px 3px', borderBottom: '0.5px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>⑨(イ+ロ)÷2</div>
                <div style={{ alignSelf: 'flex-end' }}><Computed value={avgDiv} unit="千円" /></div>
              </div>
              <div style={{ flex: 1, padding: '2px 3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>⑩(ロ+ハ)÷2</div>
                <div style={{ alignSelf: 'flex-end' }}><Computed value={avgDiv10} unit="千円" /></div>
              </div>
            </div>
          </td>
          <td style={{ fontSize: 6 }}>
            <div style={{ marginBottom: 1 }}>⑨÷⑤：Ⓑ1</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              <NumberField value={g('judge_b1')} onChange={(v) => u('judge_b1', v)} className="w-8" />
              <span>円</span>
              <NumberField value={g('judge_b1_sen')} onChange={(v) => u('judge_b1_sen', v)} className="w-6" />
              <span>銭</span>
            </div>
          </td>
        </tr>
        {/* 直前々期 */}
        <tr>
          <td style={{ ...hdr, textAlign: 'center' }}>直前々期</td>
          <td><NumberField value={g('div_y2')} onChange={(v) => u('div_y2', v)} unit="千円" /></td>
          <td><NumberField value={g('div_extra_y2')} onChange={(v) => u('div_extra_y2', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 6, marginRight: 2 }}>ロ</span>
              <Computed value={divRegY2} unit="千円" />
            </div>
          </td>
          {/* col5: spanned */}
          <td style={{ fontSize: 6 }}>
            <div style={{ marginBottom: 1 }}>⑩÷⑤：Ⓑ2</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              <NumberField value={g('judge_b2')} onChange={(v) => u('judge_b2', v)} className="w-8" />
              <span>円</span>
              <NumberField value={g('judge_b2_sen')} onChange={(v) => u('judge_b2_sen', v)} className="w-6" />
              <span>銭</span>
            </div>
          </td>
        </tr>
        {/* 直前々前期の前期 */}
        <tr>
          <td style={{ ...hdr, textAlign: 'center', fontSize: 5.5 }}>直前々前期<br />の前期</td>
          <td><NumberField value={g('div_y3')} onChange={(v) => u('div_y3', v)} unit="千円" /></td>
          <td><NumberField value={g('div_extra_y3')} onChange={(v) => u('div_extra_y3', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 6, marginRight: 2 }}>ハ</span>
              <Computed value={divRegY3} unit="千円" />
            </div>
          </td>
          {/* col5: spanned */}
          <td style={{ padding: 0, fontSize: 5 }}>
            <div style={{ ...hdr, textAlign: 'center', padding: '1px', borderBottom: '0.5px solid #000', whiteSpace: 'nowrap', fontSize: 4.5 }}>
              1株(50円)当たりの年配当金額（Ⓑ1の金額）
            </div>
            <div style={{ padding: '2px 3px' }}>
              <div style={{ marginBottom: 1 }}>Ⓑ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                <NumberField value={g('judge_b')} onChange={(v) => u('judge_b', v)} className="w-8" />
                <span>円</span>
                <NumberField value={g('judge_b_sen')} onChange={(v) => u('judge_b_sen', v)} className="w-6" />
                <span>銭</span>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ---- 利益金額テーブル ---- */
function ProfitTable({ g, u, profitY1, profitY2, profitY3, th55, th6 }: {
  g: GFn; u: UFn;
  profitY1: number | null; profitY2: number | null; profitY3: number | null;
  th55: React.CSSProperties; th6: React.CSSProperties;
}) {
  return (
    <table className="gov-table" style={{ fontSize: 6.5, tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '30%' }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={7} style={{ ...hdr, textAlign: 'center' }}>直前期末以前２（３）年間の利益金額</td>
          <td rowSpan={2} style={{ ...hdr, ...th6, lineHeight: 1.3, textAlign: 'center' }}>比準要素数１の会社、比準要素数０の会社の<br />判定要素の金額</td>
        </tr>
        <tr>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>事業年度</td>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>⑪法人税の課<br />税所得金額</td>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>⑫非経常的な<br />利益金額</td>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>⑬受取配当等の<br />益金不算入額</td>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>⑭左の所得税<br />住民税を含む</td>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>⑮繰越欠損金<br />控除額</td>
          <td style={{ ...hdr, ...th55, textAlign: 'center' }}>⑯利益金額<br />(⑪−⑫−⑬<br />+⑭+⑮)</td>
        </tr>
        <tr>
          <td style={{ ...hdr, textAlign: 'center' }}>直 前 期</td>
          <td><NumberField value={g('income_y1')} onChange={(v) => u('income_y1', v)} unit="千円" /></td>
          <td><NumberField value={g('extra_profit_y1')} onChange={(v) => u('extra_profit_y1', v)} unit="千円" /></td>
          <td><NumberField value={g('div_exclusion_y1')} onChange={(v) => u('div_exclusion_y1', v)} unit="千円" /></td>
          <td><NumberField value={g('tax_y1')} onChange={(v) => u('tax_y1', v)} unit="千円" /></td>
          <td><NumberField value={g('loss_deduct_y1')} onChange={(v) => u('loss_deduct_y1', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 6 }}>二</span>
              <Computed value={profitY1} unit="千円" />
            </div>
          </td>
          <td rowSpan={3} style={{ verticalAlign: 'top', padding: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', borderBottom: '0.5px solid #000' }}>
                <div style={{ fontSize: 5.5, marginBottom: 1 }}>ニ÷⑤又は｛｛ニ＋ホ｝÷２｝÷⑤：Ⓒ1</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_c1')} onChange={(v) => u('judge_c1', v)} className="w-10" />
                  <span style={{ fontSize: 6 }}>円</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', borderBottom: '0.5px solid #000' }}>
                <div style={{ fontSize: 5.5, marginBottom: 1 }}>ホ÷⑤又は｛｛ホ＋ヘ｝÷２｝÷⑤：Ⓒ2</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_c2')} onChange={(v) => u('judge_c2', v)} className="w-10" />
                  <span style={{ fontSize: 6 }}>円</span>
                </div>
              </div>
              <div style={{ ...hdr, textAlign: 'center', padding: '1px', fontSize: 6, borderBottom: '0.5px solid #000' }}>
                1株(50円)当たりの年利益金額<br />（ニ÷⑤又は｛｛ニ＋ホ｝÷２｝÷⑤の金額）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px' }}>
                <div style={{ fontSize: 6, marginBottom: 1 }}>Ⓒ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_c_final')} onChange={(v) => u('judge_c_final', v)} className="w-10" />
                  <span style={{ fontSize: 6 }}>円</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ ...hdr, textAlign: 'center' }}>直前々期</td>
          <td><NumberField value={g('income_y2')} onChange={(v) => u('income_y2', v)} unit="千円" /></td>
          <td><NumberField value={g('extra_profit_y2')} onChange={(v) => u('extra_profit_y2', v)} unit="千円" /></td>
          <td><NumberField value={g('div_exclusion_y2')} onChange={(v) => u('div_exclusion_y2', v)} unit="千円" /></td>
          <td><NumberField value={g('tax_y2')} onChange={(v) => u('tax_y2', v)} unit="千円" /></td>
          <td><NumberField value={g('loss_deduct_y2')} onChange={(v) => u('loss_deduct_y2', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 6 }}>ホ</span>
              <Computed value={profitY2} unit="千円" />
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ ...hdr, textAlign: 'center', fontSize: 5.5 }}>直前々前期<br />の前期</td>
          <td><NumberField value={g('income_y3')} onChange={(v) => u('income_y3', v)} unit="千円" /></td>
          <td><NumberField value={g('extra_profit_y3')} onChange={(v) => u('extra_profit_y3', v)} unit="千円" /></td>
          <td><NumberField value={g('div_exclusion_y3')} onChange={(v) => u('div_exclusion_y3', v)} unit="千円" /></td>
          <td><NumberField value={g('tax_y3')} onChange={(v) => u('tax_y3', v)} unit="千円" /></td>
          <td><NumberField value={g('loss_deduct_y3')} onChange={(v) => u('loss_deduct_y3', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 6 }}>ヘ</span>
              <Computed value={profitY3} unit="千円" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ---- 純資産価額テーブル ---- */
function AssetTable({ g, u, assetY1, assetY2, th6 }: {
  g: GFn; u: UFn;
  assetY1: number | null; assetY2: number | null;
  th6: React.CSSProperties;
}) {
  return (
    <table className="gov-table" style={{ fontSize: 6.5, tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '10%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '30%' }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={4} style={{ ...hdr, textAlign: 'center' }}>直前期末（直前々期末）の純資産価額</td>
          <td rowSpan={2} style={{ ...hdr, ...th6, lineHeight: 1.3, textAlign: 'center' }}>比準要素数１の会社、比準要素数０の会社の<br />判定要素の金額</td>
        </tr>
        <tr>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>事業年度</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑰ 資本金等の額</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑱ 利益積立金額</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑲ 純資産価額<br />（⑰＋⑱）</td>
        </tr>
        <tr>
          <td style={{ ...hdr, textAlign: 'center' }}>直 前 期</td>
          <td><NumberField value={g('cap_y1')} onChange={(v) => u('cap_y1', v)} unit="千円" /></td>
          <td><NumberField value={g('retained_y1')} onChange={(v) => u('retained_y1', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 6 }}>ト</span>
              <Computed value={assetY1} unit="千円" />
            </div>
          </td>
          <td rowSpan={2} style={{ verticalAlign: 'top', padding: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', borderBottom: '0.5px solid #000' }}>
                <div style={{ fontSize: 6, marginBottom: 1 }}>ト÷⑤：Ⓓ1</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_d1')} onChange={(v) => u('judge_d1', v)} className="w-10" />
                  <span style={{ fontSize: 6 }}>円</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', borderBottom: '0.5px solid #000' }}>
                <div style={{ fontSize: 6, marginBottom: 1 }}>チ÷⑤：Ⓓ2</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_d2')} onChange={(v) => u('judge_d2', v)} className="w-10" />
                  <span style={{ fontSize: 6 }}>円</span>
                </div>
              </div>
              <div style={{ ...hdr, textAlign: 'center', padding: '1px', fontSize: 6, borderBottom: '0.5px solid #000' }}>
                1株(50円)当たりの純資産価額<br />（ト÷⑤の金額）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px' }}>
                <div style={{ fontSize: 6, marginBottom: 1 }}>Ⓓ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_d_final')} onChange={(v) => u('judge_d_final', v)} className="w-10" />
                  <span style={{ fontSize: 6 }}>円</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ ...hdr, textAlign: 'center' }}>直前々期</td>
          <td><NumberField value={g('cap_y2')} onChange={(v) => u('cap_y2', v)} unit="千円" /></td>
          <td><NumberField value={g('retained_y2')} onChange={(v) => u('retained_y2', v)} unit="千円" /></td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 6 }}>チ</span>
              <Computed value={assetY2} unit="千円" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
