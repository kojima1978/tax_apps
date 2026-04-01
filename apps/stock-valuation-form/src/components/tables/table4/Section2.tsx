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

const DIV_YEARS = [
  { label: '直 前 期', suffix: 'y1', kana: 'イ', judgeLabel: '⑨÷⑤：Ⓑ1', judgeKey: 'judge_b1' },
  { label: '直前々期', suffix: 'y2', kana: 'ロ', judgeLabel: '⑩÷⑤：Ⓑ2', judgeKey: 'judge_b2' },
  { label: <>直前々前期<br />の前期</>, suffix: 'y3', kana: 'ハ', labelFontSize: 5.5 },
] as const;

function DividendTable({ g, u, divRegY1, divRegY2, divRegY3, avgDiv, avgDiv10 }: {
  g: GFn; u: UFn;
  divRegY1: number | null; divRegY2: number | null; divRegY3: number | null;
  avgDiv: number | null; avgDiv10: number | null;
}) {
  const th6: React.CSSProperties = { fontSize: 6, lineHeight: 1.2 };
  const divRegs = [divRegY1, divRegY2, divRegY3];
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
        <tr>
          <td colSpan={5} style={{ ...hdr, textAlign: 'center' }}>直前期末以前２（３）年間の年平均配当金額</td>
          <td rowSpan={2} style={{ ...hdr, ...th6, lineHeight: 1.3, textAlign: 'center' }}>
            比準要素数１の会社、比準要素数０の会社の<br />判定要素の金額
          </td>
        </tr>
        <tr>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>事業年度</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑥年配当<br />金額</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑦左のうち非経常<br />的な配当金額</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>⑧差引経常的な年<br />配当金額(⑥−⑦)</td>
          <td style={{ ...hdr, ...th6, textAlign: 'center' }}>年平均<br />配当金額</td>
        </tr>
        {DIV_YEARS.map((yr, i) => (
          <tr key={yr.suffix}>
            <td style={{ ...hdr, textAlign: 'center', ...('labelFontSize' in yr ? { fontSize: yr.labelFontSize } : {}) }}>{yr.label}</td>
            <td><NumberField value={g(`div_${yr.suffix}`)} onChange={(v) => u(`div_${yr.suffix}`, v)} unit="千円" /></td>
            <td><NumberField value={g(`div_extra_${yr.suffix}`)} onChange={(v) => u(`div_extra_${yr.suffix}`, v)} unit="千円" /></td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 6, marginRight: 2 }}>{yr.kana}</span>
                <Computed value={divRegs[i]!} unit="千円" />
              </div>
            </td>
            {i === 0 && (
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
            )}
            {'judgeKey' in yr ? (
              <td style={{ fontSize: 6 }}>
                <div style={{ marginBottom: 1 }}>{yr.judgeLabel}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                  <NumberField value={g(yr.judgeKey)} onChange={(v) => u(yr.judgeKey, v)} className="w-8" />
                  <span>円</span>
                  <NumberField value={g(`${yr.judgeKey}_sen`)} onChange={(v) => u(`${yr.judgeKey}_sen`, v)} className="w-6" />
                  <span>銭</span>
                </div>
              </td>
            ) : (
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
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---- 利益金額テーブル ---- */

const PROFIT_YEARS = [
  { label: '直 前 期', suffix: 'y1', kana: '二' },
  { label: '直前々期', suffix: 'y2', kana: 'ホ' },
  { label: <>直前々前期<br />の前期</>, suffix: 'y3', kana: 'ヘ', labelFontSize: 5.5 },
] as const;

const PROFIT_FIELDS = ['income', 'extra_profit', 'div_exclusion', 'tax', 'loss_deduct'] as const;

function ProfitTable({ g, u, profitY1, profitY2, profitY3, th55, th6 }: {
  g: GFn; u: UFn;
  profitY1: number | null; profitY2: number | null; profitY3: number | null;
  th55: React.CSSProperties; th6: React.CSSProperties;
}) {
  const profits = [profitY1, profitY2, profitY3];
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
        {PROFIT_YEARS.map((yr, i) => (
          <tr key={yr.suffix}>
            <td style={{ ...hdr, textAlign: 'center', ...('labelFontSize' in yr ? { fontSize: yr.labelFontSize } : {}) }}>{yr.label}</td>
            {PROFIT_FIELDS.map((f) => (
              <td key={f}><NumberField value={g(`${f}_${yr.suffix}`)} onChange={(v) => u(`${f}_${yr.suffix}`, v)} unit="千円" /></td>
            ))}
            <td>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 6 }}>{yr.kana}</span>
                <Computed value={profits[i]!} unit="千円" />
              </div>
            </td>
            {i === 0 && (
              <td rowSpan={3} style={{ verticalAlign: 'top', padding: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {([
                    { label: 'ニ÷⑤又は｛｛ニ＋ホ｝÷２｝÷⑤：Ⓒ1', key: 'judge_c1' },
                    { label: 'ホ÷⑤又は｛｛ホ＋ヘ｝÷２｝÷⑤：Ⓒ2', key: 'judge_c2' },
                  ] as const).map((j) => (
                    <div key={j.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', borderBottom: '0.5px solid #000' }}>
                      <div style={{ fontSize: 5.5, marginBottom: 1 }}>{j.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                        <NumberField value={g(j.key)} onChange={(v) => u(j.key, v)} className="w-10" />
                        <span style={{ fontSize: 6 }}>円</span>
                      </div>
                    </div>
                  ))}
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
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---- 純資産価額テーブル ---- */

const ASSET_YEARS = [
  { label: '直 前 期', suffix: 'y1', kana: 'ト' },
  { label: '直前々期', suffix: 'y2', kana: 'チ' },
] as const;

function AssetTable({ g, u, assetY1, assetY2, th6 }: {
  g: GFn; u: UFn;
  assetY1: number | null; assetY2: number | null;
  th6: React.CSSProperties;
}) {
  const assets = [assetY1, assetY2];
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
        {ASSET_YEARS.map((yr, i) => (
          <tr key={yr.suffix}>
            <td style={{ ...hdr, textAlign: 'center' }}>{yr.label}</td>
            <td><NumberField value={g(`cap_${yr.suffix}`)} onChange={(v) => u(`cap_${yr.suffix}`, v)} unit="千円" /></td>
            <td><NumberField value={g(`retained_${yr.suffix}`)} onChange={(v) => u(`retained_${yr.suffix}`, v)} unit="千円" /></td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 6 }}>{yr.kana}</span>
                <Computed value={assets[i]!} unit="千円" />
              </div>
            </td>
            {i === 0 && (
              <td rowSpan={2} style={{ verticalAlign: 'top', padding: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {([
                    { label: 'ト÷⑤：Ⓓ1', key: 'judge_d1' },
                    { label: 'チ÷⑤：Ⓓ2', key: 'judge_d2' },
                  ] as const).map((j) => (
                    <div key={j.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2px 3px', borderBottom: '0.5px solid #000' }}>
                      <div style={{ fontSize: 6, marginBottom: 1 }}>{j.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-end' }}>
                        <NumberField value={g(j.key)} onChange={(v) => u(j.key, v)} className="w-10" />
                        <span style={{ fontSize: 6 }}>円</span>
                      </div>
                    </div>
                  ))}
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
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
