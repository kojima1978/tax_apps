import { NumberField } from '@/components/ui/NumberField';
import { Computed } from '@/components/ui/Computed';
import { bb, br, hdr, vt, parseNum } from './shared';
import type { GFn, UFn } from './shared';

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

  // Grid cell styles for 配当 section
  const gc: React.CSSProperties = {
    borderRight: '0.5px solid #000',
    borderBottom: '0.5px solid #000',
    padding: '2px 3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    overflow: 'hidden',
  };
  const ghdr: React.CSSProperties = { ...gc, background: '#f5f5f0', fontWeight: 500 };

  return (
    <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
      {/* セクション番号＋ラベル */}
      <div style={{ width: 20, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 1px', fontSize: 7 }}>
        <span style={{ marginBottom: 2, fontWeight: 700 }}>２</span>
        <span style={{ ...vt, flex: 1, fontSize: 7 }}>比準要素等の金額の計算</span>
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ---- 2a: 配当金額 ---- */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 38, ...br, ...hdr, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <span style={{ ...vt, fontSize: 6, padding: '1px' }}>1株(50円)当たりの<br />年平均配当金額</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '10% 15% 15% 15% 15% 30%',
              gridTemplateRows: 'auto auto repeat(6, minmax(0, 1fr))',
              borderTop: '0.5px solid #000',
              fontSize: 6.5,
            }}>
              {/* Row 1: Section header */}
              <div style={{ ...ghdr, gridColumn: '1/6', gridRow: '1/2' }}>
                直前期末以前２（３）年間の年平均配当金額
              </div>
              <div style={{ ...ghdr, gridColumn: '6/7', gridRow: '1/3', ...th6, lineHeight: 1.3 }}>
                比準要素数１の会社、<br />比準要素数０の会社の<br />判定要素の金額
              </div>
              {/* Row 2: Column headers */}
              <div style={{ ...ghdr, gridColumn: '1/2', gridRow: '2/3', ...th6 }}>事業年度</div>
              <div style={{ ...ghdr, gridColumn: '2/3', gridRow: '2/3', ...th6 }}>⑥年配当<br />金額</div>
              <div style={{ ...ghdr, gridColumn: '3/4', gridRow: '2/3', ...th6 }}>⑦左のうち非経常<br />的な配当金額</div>
              <div style={{ ...ghdr, gridColumn: '4/5', gridRow: '2/3', ...th6 }}>⑧差引経常的な年<br />配当金額(⑥−⑦)</div>
              <div style={{ ...ghdr, gridColumn: '5/6', gridRow: '2/3', ...th6 }}>年平均<br />配当金額</div>

              {/* イ (rows 3-4) */}
              <div style={{ ...ghdr, gridColumn: '1/2', gridRow: '3/5' }}>直 前 期</div>
              <div style={{ ...gc, gridColumn: '2/3', gridRow: '3/5' }}>
                <NumberField value={g('div_y1')} onChange={(v) => u('div_y1', v)} unit="千円" />
              </div>
              <div style={{ ...gc, gridColumn: '3/4', gridRow: '3/5' }}>
                <NumberField value={g('div_extra_y1')} onChange={(v) => u('div_extra_y1', v)} unit="千円" />
              </div>
              <div style={{ ...gc, gridColumn: '4/5', gridRow: '3/5' }}>
                <span style={{ fontSize: 6, marginRight: 2 }}>イ</span>
                <Computed value={divRegY1} unit="千円" />
              </div>

              {/* ⑨ (rows 3-5) */}
              <div style={{ ...gc, gridColumn: '5/6', gridRow: '3/6', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                <div style={{ fontSize: 6 }}>⑨(イ+ロ)÷2</div>
                <Computed value={avgDiv} unit="千円" />
              </div>

              {/* Ⓑ1 (rows 3-4) */}
              <div style={{ ...gc, gridColumn: '6/7', gridRow: '3/5', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 6, marginBottom: 1 }}>⑨÷⑤：Ⓑ1</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_b1')} onChange={(v) => u('judge_b1', v)} className="w-8" />
                  <span style={{ fontSize: 6 }}>円</span>
                  <NumberField value={g('judge_b1_sen')} onChange={(v) => u('judge_b1_sen', v)} className="w-6" />
                  <span style={{ fontSize: 6 }}>銭</span>
                </div>
              </div>

              {/* ロ (rows 5-6) */}
              <div style={{ ...ghdr, gridColumn: '1/2', gridRow: '5/7' }}>直前々期</div>
              <div style={{ ...gc, gridColumn: '2/3', gridRow: '5/7' }}>
                <NumberField value={g('div_y2')} onChange={(v) => u('div_y2', v)} unit="千円" />
              </div>
              <div style={{ ...gc, gridColumn: '3/4', gridRow: '5/7' }}>
                <NumberField value={g('div_extra_y2')} onChange={(v) => u('div_extra_y2', v)} unit="千円" />
              </div>
              <div style={{ ...gc, gridColumn: '4/5', gridRow: '5/7' }}>
                <span style={{ fontSize: 6, marginRight: 2 }}>ロ</span>
                <Computed value={divRegY2} unit="千円" />
              </div>

              {/* Ⓑ2 (rows 5-6) */}
              <div style={{ ...gc, gridColumn: '6/7', gridRow: '5/7', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 6, marginBottom: 1 }}>⑩÷⑤：Ⓑ2</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                  <NumberField value={g('judge_b2')} onChange={(v) => u('judge_b2', v)} className="w-8" />
                  <span style={{ fontSize: 6 }}>円</span>
                  <NumberField value={g('judge_b2_sen')} onChange={(v) => u('judge_b2_sen', v)} className="w-6" />
                  <span style={{ fontSize: 6 }}>銭</span>
                </div>
              </div>

              {/* ⑩ (rows 6-8) */}
              <div style={{ ...gc, gridColumn: '5/6', gridRow: '6/9', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                <div style={{ fontSize: 6 }}>⑩(ロ+ハ)÷2</div>
                <Computed value={avgDiv10} unit="千円" />
              </div>

              {/* ハ (rows 7-8) */}
              <div style={{ ...ghdr, gridColumn: '1/2', gridRow: '7/9', fontSize: 5.5 }}>直前々前期<br />の前期</div>
              <div style={{ ...gc, gridColumn: '2/3', gridRow: '7/9' }}>
                <NumberField value={g('div_y3')} onChange={(v) => u('div_y3', v)} unit="千円" />
              </div>
              <div style={{ ...gc, gridColumn: '3/4', gridRow: '7/9' }}>
                <NumberField value={g('div_extra_y3')} onChange={(v) => u('div_extra_y3', v)} unit="千円" />
              </div>
              <div style={{ ...gc, gridColumn: '4/5', gridRow: '7/9' }}>
                <span style={{ fontSize: 6, marginRight: 2 }}>ハ</span>
                <Computed value={divRegY3} unit="千円" />
              </div>

              {/* Ⓑ (rows 7-8): label at top + input below */}
              <div style={{ ...gc, gridColumn: '6/7', gridRow: '7/9', flexDirection: 'column', alignItems: 'flex-start', padding: 0 }}>
                <div style={{ ...hdr, width: '100%', textAlign: 'center', padding: '1px', fontSize: 6, borderBottom: '0.5px solid #000' }}>
                  1株(50円)当たりの年配当金額<br />（Ⓑ1の金額）
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', width: '100%' }}>
                  <div style={{ fontSize: 6, marginBottom: 1 }}>Ⓑ</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                    <NumberField value={g('judge_b')} onChange={(v) => u('judge_b', v)} className="w-8" />
                    <span style={{ fontSize: 6 }}>円</span>
                    <NumberField value={g('judge_b_sen')} onChange={(v) => u('judge_b_sen', v)} className="w-6" />
                    <span style={{ fontSize: 6 }}>銭</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- 2b: 利益金額 ---- */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 38, ...br, ...hdr, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <span style={{ ...vt, fontSize: 6, padding: '1px' }}>1株(50円)当たりの<br />年利益金額等</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
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
              <thead>
                <tr>
                  <th colSpan={7} style={{ fontSize: 6.5 }}>
                    直前期末以前２（３）年間の利益金額
                  </th>
                  <th rowSpan={2} style={{ ...th6, lineHeight: 1.3 }}>比準要素数１の会社、<br />比準要素数０の会社の<br />判定要素の金額</th>
                </tr>
                <tr>
                  <th style={th55}>事業年度</th>
                  <th style={th55}>⑪法人税の課<br />税所得金額</th>
                  <th style={th55}>⑫非経常的な<br />利益金額</th>
                  <th style={th55}>⑬受取配当等の<br />益金不算入額</th>
                  <th style={th55}>⑭左の所得税<br />住民税を含む</th>
                  <th style={th55}>⑮繰越欠損金<br />控除額</th>
                  <th style={th55}>⑯利益金額<br />(⑪−⑫−⑬<br />+⑭+⑮)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>直 前 期</th>
                  <td><NumberField value={g('income_y1')} onChange={(v) => u('income_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('extra_profit_y1')} onChange={(v) => u('extra_profit_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_exclusion_y1')} onChange={(v) => u('div_exclusion_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('tax_y1')} onChange={(v) => u('tax_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('loss_deduct_y1')} onChange={(v) => u('loss_deduct_y1', v)} unit="千円" /></td>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 3px' }}>
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
                  <th>直前々期</th>
                  <td><NumberField value={g('income_y2')} onChange={(v) => u('income_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('extra_profit_y2')} onChange={(v) => u('extra_profit_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_exclusion_y2')} onChange={(v) => u('div_exclusion_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('tax_y2')} onChange={(v) => u('tax_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('loss_deduct_y2')} onChange={(v) => u('loss_deduct_y2', v)} unit="千円" /></td>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 3px' }}>
                      <span style={{ fontSize: 6 }}>ホ</span>
                      <Computed value={profitY2} unit="千円" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <th style={{ fontSize: 5.5 }}>直前々前期<br />の前期</th>
                  <td><NumberField value={g('income_y3')} onChange={(v) => u('income_y3', v)} unit="千円" /></td>
                  <td><NumberField value={g('extra_profit_y3')} onChange={(v) => u('extra_profit_y3', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_exclusion_y3')} onChange={(v) => u('div_exclusion_y3', v)} unit="千円" /></td>
                  <td><NumberField value={g('tax_y3')} onChange={(v) => u('tax_y3', v)} unit="千円" /></td>
                  <td><NumberField value={g('loss_deduct_y3')} onChange={(v) => u('loss_deduct_y3', v)} unit="千円" /></td>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 3px' }}>
                      <span style={{ fontSize: 6 }}>ヘ</span>
                      <Computed value={profitY3} unit="千円" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- 2c: 純資産価額 ---- */}
        <div style={{ display: 'flex' }}>
          <div style={{ width: 38, ...br, ...hdr, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <span style={{ ...vt, fontSize: 6, padding: '1px' }}>1株(50円)当たりの<br />純資産価額の<br />金額の計算</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <table className="gov-table" style={{ fontSize: 6.5, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={4} style={{ fontSize: 6.5 }}>
                    直前期末（直前々期末）の純資産価額
                  </th>
                  <th rowSpan={2} style={{ ...th6, lineHeight: 1.3 }}>比準要素数１の会社、<br />比準要素数０の会社の<br />判定要素の金額</th>
                </tr>
                <tr>
                  <th style={th6}>事業年度</th>
                  <th style={th6}>⑰ 資本金等の額</th>
                  <th style={th6}>⑱ 利益積立金額</th>
                  <th style={th6}>⑲ 純資産価額<br />（⑰＋⑱）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>直 前 期</th>
                  <td><NumberField value={g('cap_y1')} onChange={(v) => u('cap_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('retained_y1')} onChange={(v) => u('retained_y1', v)} unit="千円" /></td>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 3px' }}>
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
                  <th>直前々期</th>
                  <td><NumberField value={g('cap_y2')} onChange={(v) => u('cap_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('retained_y2')} onChange={(v) => u('retained_y2', v)} unit="千円" /></td>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 3px' }}>
                      <span style={{ fontSize: 6 }}>チ</span>
                      <Computed value={assetY2} unit="千円" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
