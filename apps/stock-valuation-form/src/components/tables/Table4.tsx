import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table4';
const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;
const hdr: React.CSSProperties = { background: '#f5f5f0', fontWeight: 500 };
const vt: React.CSSProperties = { writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.12em' };

/* ---- 類似業種ブロック (共通レンダラー) ---- */
function IndustryBlock({
  prefix,
  g,
  u,
}: {
  prefix: string;
  g: (f: string) => string;
  u: (f: string, v: string) => void;
}) {
  const p = (f: string) => `${prefix}_${f}`;
  const rows = [
    { label: '課税時期の属する月', sub: '月' },
    { label: '属する月の前月', sub: '月' },
    { label: '属する月の前々月', sub: '月' },
    { label: '前年平均株価', sub: '' },
    { label: '課税時期の属する月以前２年間の平均株価', sub: '' },
  ];
  return (
    <div style={{ display: 'flex', ...bb }}>
      {/* 左: 類似業種 */}
      <div style={{ width: '46%', ...br, display: 'flex' }}>
        {/* 業種目 */}
        <div style={{ width: 80, ...br, fontSize: 6.5 }}>
          <div style={{ ...bb, padding: '1px 2px', textAlign: 'center' }}>
            類似業種と<br />業種目番号
          </div>
          <div style={{ ...bb, padding: '1px 2px', display: 'flex', alignItems: 'center', gap: 2 }}>
            <span>（No.</span>
            <FormField value={g(p('no'))} onChange={(v) => u(p('no'), v)} className="w-8" />
            <span>）</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ ...bb, padding: '1px 2px', display: 'flex', alignItems: 'center', fontSize: 6 }}>
              <span style={{ flex: 1 }}>{r.label}</span>
              {r.sub && (
                <>
                  <FormField value={g(p(`month_${i}`))} onChange={(v) => u(p(`month_${i}`), v)} className="w-4" />
                  <span>{r.sub}</span>
                </>
              )}
            </div>
          ))}
          <div style={{ padding: '1px 2px', fontSize: 6 }}>
            Ａ　上記のうち最も低いもの
          </div>
        </div>
        {/* 株価列 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6.5 }}>
            類似業種の株価
          </div>
          <div style={{ ...bb, padding: '1px 2px', fontSize: 6.5, textAlign: 'center' }}>&nbsp;</div>
          {rows.map((_, i) => (
            <div key={i} style={{ ...bb, padding: '1px 2px' }}>
              <NumberField value={g(p(`price_${i}`))} onChange={(v) => u(p(`price_${i}`), v)} unit="円" />
            </div>
          ))}
          <div style={{ padding: '1px 2px', display: 'flex', alignItems: 'center' }}>
            <NumberField value={g(p('price_a'))} onChange={(v) => u(p('price_a'), v)} unit="円" />
          </div>
        </div>
      </div>

      {/* 右: 比準要素 */}
      <div style={{ flex: 1, fontSize: 6.5 }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 32, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6 }}>区　分</div>
          <div style={{ flex: 1, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
            1株(50円)当たりの<br />年配当金額の
          </div>
          <div style={{ flex: 1, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
            1株(50円)当たりの<br />年利益金額の
          </div>
          <div style={{ flex: 1, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
            1株(50円)当たりの<br />純資産価額の
          </div>
          <div style={{ flex: 1, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
            1株(50円)当たりの<br />比 準 額
          </div>
        </div>

        {/* 評価会社 / 類似業種 */}
        {['評価\n会社', '類似\n業種'].map((label, idx) => (
          <div key={idx} style={{ display: 'flex', ...bb }}>
            <div style={{ width: 32, ...br, ...hdr, textAlign: 'center', padding: '1px', whiteSpace: 'pre-line', fontSize: 6 }}>
              {label.replace('\n', '\n')}
            </div>
            {['b', 'c', 'd'].map((col) => (
              <div key={col} style={{ flex: 1, ...br, padding: '1px 2px' }}>
                <NumberField value={g(p(`${idx === 0 ? 'ev' : 'sim'}_${col}`))} onChange={(v) => u(p(`${idx === 0 ? 'ev' : 'sim'}_${col}`), v)} />
                {idx === 0 && <div style={{ textAlign: 'center', fontSize: 6 }}>{col === 'b' ? 'Ⓑ' : col === 'c' ? 'Ⓒ' : 'Ⓓ'}</div>}
                {idx === 1 && <div style={{ textAlign: 'center', fontSize: 6 }}>0</div>}
              </div>
            ))}
            <div style={{ flex: 1, padding: '1px 2px', fontSize: 5.5 }}>
              {idx === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  ※<br />③ × ⓑ × 0.7
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: 5 }}>
                  ※<br />中会社は0.6<br />小会社は0.5<br />とします。
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 合計 */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 32, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6 }}>合計</div>
          {['b', 'c', 'd'].map((col) => (
            <div key={col} style={{ flex: 1, ...br, padding: '1px 2px', textAlign: 'center', fontSize: 6 }}>
              {col.toUpperCase()}
            </div>
          ))}
          <div style={{ flex: 1 }} />
        </div>

        {/* 要素別比準割合 */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 32, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
            要素別<br />比準割合
          </div>
          {['b', 'c', 'd'].map((col) => (
            <div key={col} style={{ flex: 1, ...br, padding: '1px 2px' }}>
              <NumberField value={g(p(`ratio_${col}`))} onChange={(v) => u(p(`ratio_${col}`), v)} />
            </div>
          ))}
          <div style={{ flex: 1, padding: '1px 2px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <NumberField value={g(p('hikijun'))} onChange={(v) => u(p('hikijun'), v)} />
            <span className="whitespace-nowrap ml-0.5">円　銭</span>
          </div>
        </div>

        {/* 比準割合 */}
        <div style={{ display: 'flex' }}>
          <div style={{ width: 32, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6 }}>
            比準<br />割合
          </div>
          <div style={{ flex: 3, ...br, padding: '1px 4px', textAlign: 'center', fontSize: 6 }}>
            <span>ⓑ ＋ ⓒ ＋ ⓓ</span>
            <br />
            <span style={{ borderTop: '0.5px solid #000', display: 'inline-block', width: 20, marginTop: 1 }}>３</span>
          </div>
          <div style={{ flex: 1, padding: '1px 2px', textAlign: 'center', fontSize: 6 }}>
            ＝
          </div>
          <div style={{ flex: 1, padding: '1px 2px', textAlign: 'right' }}>
            <NumberField value={g(p('ratio_total'))} onChange={(v) => u(p('ratio_total'), v)} />
            <span style={{ fontSize: 6 }}>0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const parseNum = (v: string) => parseInt(v, 10) || 0;

// セクション1.1のフィールド
const SEC1_FIELDS = ['capital', 'issued_shares', 'capital_per_share', 'shares_50yen'];
// セクション2 配当のフィールド
const SEC2_DIV_FIELDS = ['div_y1', 'div_extra_y1', 'div_reg_y1', 'div_y2', 'div_extra_y2', 'div_reg_y2', 'div_y3', 'div_extra_y3', 'div_reg_y3', 'avg_div'];
// セクション2 利益のフィールド
const SEC2_PROFIT_FIELDS = ['income_y1', 'extra_profit_y1', 'div_exclusion_y1', 'tax_y1', 'loss_deduct_y1', 'net_profit_y1', 'income_y2', 'extra_profit_y2', 'div_exclusion_y2', 'tax_y2', 'loss_deduct_y2', 'net_profit_y2', 'income_y3', 'extra_profit_y3', 'div_exclusion_y3', 'tax_y3', 'loss_deduct_y3', 'net_profit_y3'];
// セクション2 純資産のフィールド
const SEC2_ASSET_FIELDS = ['cap_y1', 'retained_y1', 'net_asset_y1', 'cap_y2', 'retained_y2', 'net_asset_y2'];

export function Table4({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  // ---- 自動計算（派生値） ----
  const capital = parseNum(g('capital'));
  const issuedShares = parseNum(g('issued_shares'));
  const treasuryShares = parseNum(getField('table1_1', 'treasury_shares'));
  const netShares = issuedShares - treasuryShares;
  const capitalPerShare = capital > 0 && netShares > 0 ? Math.round(capital * 1000 / netShares) : null;
  const shares50yen = capital > 0 ? capital * 20 : null;

  const calcDivReg = (yr: string) => g(`div_${yr}`) !== '' ? parseNum(g(`div_${yr}`)) - parseNum(g(`div_extra_${yr}`)) : null;
  const divRegY1 = calcDivReg('y1');
  const divRegY2 = calcDivReg('y2');
  const divRegY3 = calcDivReg('y3');
  const avgDiv = divRegY1 !== null && divRegY2 !== null ? Math.round((divRegY1 + divRegY2) / 2) : null;

  const calcProfit = (yr: string) => g(`income_${yr}`) !== '' ? parseNum(g(`income_${yr}`)) - parseNum(g(`extra_profit_${yr}`)) - parseNum(g(`div_exclusion_${yr}`)) + parseNum(g(`tax_${yr}`)) + parseNum(g(`loss_deduct_${yr}`)) : null;
  const profitY1 = calcProfit('y1');
  const profitY2 = calcProfit('y2');
  const profitY3 = calcProfit('y3');

  const calcAsset = (yr: string) => (g(`cap_${yr}`) !== '' || g(`retained_${yr}`) !== '') ? parseNum(g(`cap_${yr}`)) + parseNum(g(`retained_${yr}`)) : null;
  const assetY1 = calcAsset('y1');
  const assetY2 = calcAsset('y2');

  const fmt = (v: number | null) => v !== null ? v.toLocaleString() : '';

  const Computed = ({ value, unit }: { value: number | null; unit?: string }) => (
    <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <span style={{ flex: 1, textAlign: 'right', padding: '3px 2px' }}>{fmt(value)}</span>
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );

  // ---- リセット ----
  const resetAll = () => {
    [...SEC1_FIELDS, ...SEC2_DIV_FIELDS, ...SEC2_PROFIT_FIELDS, ...SEC2_ASSET_FIELDS].forEach((f) => u(f, ''));
  };

  return (
    <div className="gov-form" style={{ fontSize: 7 }}>
      {/* ===== タイトル行 ===== */}
      <div style={{ display: 'flex', alignItems: 'center', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>
          第４表　類似業種比準価額等の計算明細書
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', whiteSpace: 'nowrap', ...bl }}>
          <span>会社名</span>
          <span style={{ minWidth: 80 }}>{getField('table1_1', 'companyName')}</span>
        </div>
        <button
          className="no-print"
          onClick={resetAll}
          style={{ padding: '2px 8px', fontSize: 7, background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 2, cursor: 'pointer', whiteSpace: 'nowrap', marginRight: 4 }}
          title="全フィールドをリセット"
        >
          リセット
        </button>
      </div>

      {/* ===== コンテンツ ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* ======== 1.1 1株当たりの資本金等の額等の計算 ======== */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
            <div style={{ width: 90, ...br, ...hdr, padding: '2px 3px', fontSize: 7, textAlign: 'center', lineHeight: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              1.1　1株当たりの資本金<br />等の額等の計算
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* ヘッダー */}
              <div style={{ display: 'flex', ...bb, fontSize: 6, textAlign: 'center' }}>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>
                  直前期末の<br />資本金等の額
                </div>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>
                  直前期末の<br />発行済株式数
                </div>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>
                  直前期末の<br />自己株式数
                </div>
                <div style={{ flex: 1.2, ...br, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>
                  1株当たりの資本金等の額<br />（①÷（②−③））
                </div>
                <div style={{ flex: 1.2, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>
                  1株当たりの資本金等の額を<br />50円とした場合の発行済株式数<br />（①÷50円）
                </div>
              </div>
              {/* 値行 */}
              <div style={{ display: 'flex', fontSize: 7 }}>
                <div style={{ flex: 1, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>①</span>
                  <NumberField value={g('capital')} onChange={(v) => u('capital', v)} />
                  <span className="whitespace-nowrap ml-0.5">千円</span>
                </div>
                <div style={{ flex: 1, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>②</span>
                  <NumberField value={g('issued_shares')} onChange={(v) => u('issued_shares', v)} />
                  <span className="whitespace-nowrap ml-0.5">株</span>
                </div>
                <div style={{ flex: 1, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>③</span>
                  <Computed value={treasuryShares || null} unit="株" />
                </div>
                <div style={{ flex: 1.2, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>④</span>
                  <Computed value={capitalPerShare} />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>
                <div style={{ flex: 1.2, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>⑤</span>
                  <Computed value={shares50yen} />
                  <span className="whitespace-nowrap ml-0.5">株</span>
                </div>
              </div>
            </div>
          </div>

          {/* ======== 2. 比準要素等の金額の計算 ======== */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
            {/* セクション番号＋ラベル */}
            <div style={{ width: 20, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 1px', fontSize: 7 }}>
              <span style={{ marginBottom: 2, fontWeight: 700 }}>２</span>
              <span style={{ ...vt, flex: 1, fontSize: 7 }}>比準要素等の金額の計算</span>
            </div>

            {/* LEFT: データテーブル群 */}
            <div style={{ flex: 1, ...br, display: 'flex', flexDirection: 'column' }}>

              {/* ---- 2a: 配当金額 (5列×4行テーブル) ---- */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ width: 38, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...vt, fontSize: 6, padding: '1px' }}>1株(50円)当たりの年平均配当金額</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6.5 }}>
                    直前期末以前２（３）年間の年平均配当金額
                  </div>
                  <table className="gov-table" style={{ fontSize: 6.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 45, fontSize: 6 }}>事業年度</th>
                        <th style={{ fontSize: 6 }}>⑥年配当金額</th>
                        <th style={{ fontSize: 6, lineHeight: 1.2 }}>⑦左のうち非経常的な<br />配当金額</th>
                        <th style={{ fontSize: 6, lineHeight: 1.2 }}>⑧差引経常的な年<br />配当金額(⑥−⑦)</th>
                        <th style={{ fontSize: 6 }}>年平均配当金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>直 前 期</th>
                        <td><NumberField value={g('div_y1')} onChange={(v) => u('div_y1', v)} unit="千円" /></td>
                        <td><NumberField value={g('div_extra_y1')} onChange={(v) => u('div_extra_y1', v)} unit="千円" /></td>
                        <td style={{ textAlign: 'right' }}><Computed value={divRegY1} unit="千円" /></td>
                        <td rowSpan={2} style={{ verticalAlign: 'middle' }}>
                          <div style={{ textAlign: 'center', fontSize: 6 }}>⑨(⑧+⑩)÷2</div>
                          <Computed value={avgDiv} unit="千円" />
                        </td>
                      </tr>
                      <tr>
                        <th>直前々期</th>
                        <td><NumberField value={g('div_y2')} onChange={(v) => u('div_y2', v)} unit="千円" /></td>
                        <td><NumberField value={g('div_extra_y2')} onChange={(v) => u('div_extra_y2', v)} unit="千円" /></td>
                        <td style={{ textAlign: 'right' }}><Computed value={divRegY2} unit="千円" /></td>
                      </tr>
                      <tr>
                        <th style={{ fontSize: 5.5 }}>直前々前期<br />の前期</th>
                        <td><NumberField value={g('div_y3')} onChange={(v) => u('div_y3', v)} unit="千円" /></td>
                        <td><NumberField value={g('div_extra_y3')} onChange={(v) => u('div_extra_y3', v)} unit="千円" /></td>
                        <td style={{ textAlign: 'right' }}><Computed value={divRegY3} unit="千円" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ---- 2b: 利益金額 ---- */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ width: 38, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...vt, fontSize: 6, padding: '1px' }}>1株当たりの年利益金額等</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6.5 }}>
                    直前期末以前２（３）年間の利益金額
                  </div>
                  {/* テーブルヘッダー */}
                  <div style={{ display: 'flex', ...bb, fontSize: 5.5, textAlign: 'center' }}>
                    <div style={{ width: 45, ...br, ...hdr, padding: '1px' }}>事業年度</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px', lineHeight: 1.2 }}>⑪法人税の課<br />税所得金額</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px', lineHeight: 1.2 }}>⑫非経常的な<br />利益金額</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px', lineHeight: 1.2 }}>⑬受取配当等の<br />益金不算入額</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px', lineHeight: 1.2 }}>⑭左の所得税<br />住民税を含む</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px', lineHeight: 1.2 }}>⑮繰越欠損金<br />控除額</div>
                    <div style={{ flex: 1, ...hdr, padding: '1px', lineHeight: 1.2 }}>利益金額<br />(⑪−⑫−⑬<br />+⑭+⑮)</div>
                  </div>
                  {/* 直前期 */}
                  <div style={{ display: 'flex', ...bb, fontSize: 6.5 }}>
                    <div style={{ width: 45, ...br, ...hdr, textAlign: 'center', padding: '1px' }}>直 前 期</div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('income_y1')} onChange={(v) => u('income_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('extra_profit_y1')} onChange={(v) => u('extra_profit_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('div_exclusion_y1')} onChange={(v) => u('div_exclusion_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('tax_y1')} onChange={(v) => u('tax_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('loss_deduct_y1')} onChange={(v) => u('loss_deduct_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, padding: '1px 2px' }}>
                      <Computed value={profitY1} unit="千円" />
                    </div>
                  </div>
                  {/* 直前々期 */}
                  <div style={{ display: 'flex', ...bb, fontSize: 6.5 }}>
                    <div style={{ width: 45, ...br, ...hdr, textAlign: 'center', padding: '1px' }}>直前々期</div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('income_y2')} onChange={(v) => u('income_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('extra_profit_y2')} onChange={(v) => u('extra_profit_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('div_exclusion_y2')} onChange={(v) => u('div_exclusion_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('tax_y2')} onChange={(v) => u('tax_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('loss_deduct_y2')} onChange={(v) => u('loss_deduct_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, padding: '1px 2px' }}>
                      <Computed value={profitY2} unit="千円" />
                    </div>
                  </div>
                  {/* 直前々前期 */}
                  <div style={{ display: 'flex', fontSize: 6.5 }}>
                    <div style={{ width: 45, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>直前々前期<br />の前期</div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('income_y3')} onChange={(v) => u('income_y3', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('extra_profit_y3')} onChange={(v) => u('extra_profit_y3', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('div_exclusion_y3')} onChange={(v) => u('div_exclusion_y3', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('tax_y3')} onChange={(v) => u('tax_y3', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('loss_deduct_y3')} onChange={(v) => u('loss_deduct_y3', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, padding: '1px 2px' }}>
                      <Computed value={profitY3} unit="千円" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- 2c: 純資産価額 ---- */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: 38, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...vt, fontSize: 6, padding: '1px' }}>1株(50円)当たりの純資産価額の金額の計算</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6.5 }}>
                    直前期末（直前々期末）の純資産価額
                  </div>
                  {/* ヘッダー */}
                  <div style={{ display: 'flex', ...bb, fontSize: 6, textAlign: 'center' }}>
                    <div style={{ width: 45, ...br, ...hdr, padding: '1px' }}>事業年度</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px' }}>⑰ 資本金等の額</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px' }}>⑱ 利益積立金額</div>
                    <div style={{ flex: 1, ...hdr, padding: '1px', lineHeight: 1.2 }}>⑲ 純資産価額<br />（⑰＋⑱）</div>
                  </div>
                  {/* 直前期 */}
                  <div style={{ display: 'flex', ...bb, fontSize: 6.5 }}>
                    <div style={{ width: 45, ...br, ...hdr, textAlign: 'center', padding: '1px' }}>直 前 期</div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('cap_y1')} onChange={(v) => u('cap_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('retained_y1')} onChange={(v) => u('retained_y1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, padding: '1px 2px' }}>
                      <Computed value={assetY1} unit="千円" />
                    </div>
                  </div>
                  {/* 直前々期 */}
                  <div style={{ display: 'flex', fontSize: 6.5 }}>
                    <div style={{ width: 45, ...br, ...hdr, textAlign: 'center', padding: '1px' }}>直前々期</div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('cap_y2')} onChange={(v) => u('cap_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px' }}>
                      <NumberField value={g('retained_y2')} onChange={(v) => u('retained_y2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, padding: '1px 2px' }}>
                      <Computed value={assetY2} unit="千円" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: 判定要素の金額 */}
            <div style={{ width: '28%', display: 'flex', flexDirection: 'column', fontSize: 6.5 }}>
              <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '2px', fontSize: 6, lineHeight: 1.3 }}>
                比準要素数１の会社、比準要素数０<br />の会社の判定要素の金額
              </div>

              {/* 配当関連 */}
              <div style={{ ...bb, padding: '2px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⑨</span>
                  <NumberField value={g('judge_9')} onChange={(v) => u('judge_9', v)} className="w-12" />
                  <span>⑤</span>
                  <NumberField value={g('judge_9r')} onChange={(v) => u('judge_9r', v)} className="w-12" />
                  <span>円</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span>⑩</span>
                  <NumberField value={g('judge_10')} onChange={(v) => u('judge_10', v)} className="w-12" />
                  <span>⑤</span>
                  <NumberField value={g('judge_10r')} onChange={(v) => u('judge_10r', v)} className="w-12" />
                  <span>円　銭</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 6 }}>0</div>
                <div style={{ textAlign: 'center', fontSize: 6, marginTop: 2 }}>
                  1株(50円)当たりの年配当金額<br />（⑥の金額）
                </div>
              </div>

              {/* 利益関連 */}
              <div style={{ ...bb, padding: '2px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⑪×14</span>
                  <NumberField value={g('judge_11')} onChange={(v) => u('judge_11', v)} className="w-10" />
                  <span>⑪÷⑤=2</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
                  <NumberField value={g('judge_11r')} onChange={(v) => u('judge_11r', v)} className="w-16" />
                  <span>円</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 6, marginTop: 2 }}>
                  1株(50円)当たりの年利益金額<br />（⑪の金額）
                </div>
                <div style={{ fontSize: 5.5, textAlign: 'center' }}>
                  {'{'}⑨×14÷⑤の金額{'}'}
                </div>
              </div>

              {/* 純資産関連 */}
              <div style={{ padding: '2px 4px' }}>
                <div style={{ textAlign: 'center', fontSize: 6, ...bb, padding: '2px 0' }}>
                  比準要素数１の会社、比準要素数０<br />の会社の判定要素の金額
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                  <NumberField value={g('judge_net')} onChange={(v) => u('judge_net', v)} className="w-16" />
                  <span>円</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 6, marginTop: 4 }}>
                  1株(50円)当たりの純資産価額<br />（㉒の金額）
                </div>
              </div>
            </div>
          </div>

          {/* ======== 3. 類似業種比準価額の計算 ======== */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* セクション番号＋ラベル */}
            <div style={{ width: 20, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 1px', fontSize: 7 }}>
              <span style={{ marginBottom: 2, fontWeight: 700 }}>３</span>
              <span style={{ ...vt, flex: 1, fontSize: 7 }}>類似業種比準価額の計算</span>
            </div>

            {/* 内容 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Block 1: 1株当たり */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ width: 18, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...vt, fontSize: 6 }}>１株当たりの</span>
                </div>
                <div style={{ flex: 1 }}>
                  <IndustryBlock prefix="blk1" g={g} u={u} />
                </div>
              </div>

              {/* Block 2: 比準価額 */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ width: 18, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...vt, fontSize: 6 }}>比準価額の計算</span>
                </div>
                <div style={{ flex: 1 }}>
                  <IndustryBlock prefix="blk2" g={g} u={u} />
                </div>
              </div>

              {/* ---- 1株当たりの比準価額 ---- */}
              <div style={{ ...bb, padding: '2px 4px', fontSize: 7, display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1 }}>
                  1株当たりの比準価額　（⑳と⑳とのいずれか低い方の金額）×
                  <span style={{ fontSize: 6 }}>④の金額÷50円</span>
                </span>
                <span style={{ marginRight: 2, fontWeight: 500 }}>⑳</span>
                <NumberField value={g('hikijun_price')} onChange={(v) => u('hikijun_price', v)} className="w-16" />
                <span className="whitespace-nowrap ml-0.5">円</span>
              </div>

              {/* ---- 修正: 配当 ---- */}
              <div style={{ ...bb, padding: '2px 4px', fontSize: 6.5, display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div>直前期末の翌日から課税時期までの間に配当金交付の効力が発生した場合</div>
                  <div style={{ fontSize: 6, paddingLeft: 8 }}>（⑳の金額）ー　1株当たりの配当金額</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 6.5 }}>
                  <div>修正比準価額</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 2 }}>⑳</span>
                    <NumberField value={g('modified_hikijun')} onChange={(v) => u('modified_hikijun', v)} className="w-14" />
                    <span className="whitespace-nowrap ml-0.5">円</span>
                  </div>
                </div>
              </div>

              {/* ---- 修正: 割当て ---- */}
              <div style={{ padding: '2px 4px', fontSize: 6.5, display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div>直前期末の翌日から課税時期までの間に株式の割当て等の効力が発生した場合</div>
                  <div style={{ fontSize: 6, paddingLeft: 8, display: 'flex', gap: 8 }}>
                    <span>比準価額</span>
                    <span>割当株式1株当たりの払込金額</span>
                    <span>1株当たりの割当株式数又は交付株式数</span>
                  </div>
                  <div style={{ fontSize: 6, paddingLeft: 8, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <span>（⑳又は⑳があるときは⑳）の金額</span>
                    <span>×</span>
                    <NumberField value={g('mod2_price')} onChange={(v) => u('mod2_price', v)} className="w-8" />
                    <span>円</span>
                    <NumberField value={g('mod2_shares')} onChange={(v) => u('mod2_shares', v)} className="w-8" />
                    <span>株）÷（1株＋</span>
                    <NumberField value={g('mod2_ratio')} onChange={(v) => u('mod2_ratio', v)} className="w-6" />
                    <span>株）</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 6.5 }}>
                  <div>修正比準価額</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 2 }}>⑳</span>
                    <NumberField value={g('modified_hikijun2')} onChange={(v) => u('modified_hikijun2', v)} className="w-14" />
                    <span className="whitespace-nowrap ml-0.5">円</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}
