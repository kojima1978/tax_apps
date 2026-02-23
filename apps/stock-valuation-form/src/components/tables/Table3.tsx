import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table3';
const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;
const hdr: React.CSSProperties = { background: '#f5f5f0', fontWeight: 500 };
const vt: React.CSSProperties = { writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.12em' };

export function Table3({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form" style={{ fontSize: 8.5 }}>
      {/* ===== タイトル行 ===== */}
      <div style={{ display: 'flex', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 10 }}>
          第３表　一般の評価会社の株式及び株式に関する権利の価額の計算明細書
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', ...bl }}>
          <span>会社名</span>
          <FormField value={g('companyName')} onChange={(v) => u('companyName', v)} className="w-32" />
        </div>
      </div>

      {/* ===== 3カラム: 左サイドバー | 中央 | 右サイドバー ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* ======== ①②③ ヘッダー ======== */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
            {/* 左ラベル */}
            <div style={{ width: '18%', ...br, ...hdr, padding: '3px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 7.5, lineHeight: 1.4 }}>
              1株当たりの<br />価額の計算の<br />基となる金額
            </div>
            {/* 中央: ①② */}
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
            {/* 右: ③ */}
            <div style={{ width: '22%', padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 7 }}>
              <div style={{ lineHeight: 1.3 }}>１株当たりの純資産価額の80％相当額（第５表の⑫の記載がある場合のその金額）</div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                <span style={{ marginRight: 4 }}>③</span>
                <NumberField value={g('net_asset_80')} onChange={(v) => u('net_asset_80', v)} unit="円" className="w-16" />
              </div>
            </div>
          </div>

          {/* ======== セクション1: 原則的評価方式による価額 ======== */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #000', flex: 1, minHeight: 0 }}>
            {/* セクション番号＋ラベル */}
            <div style={{ width: 26, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', fontSize: 8 }}>
              <span style={{ marginBottom: 4, fontWeight: 700 }}>１</span>
              <span style={{ ...vt, flex: 1 }}>原則的評価方式による価額</span>
            </div>

            {/* セクション内容 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* サブラベル列 + テーブル */}
              <div style={{ display: 'flex', flex: 1 }}>
                {/* サブラベル列 */}
                <div style={{ width: 48, ...br, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 5, ...bb, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ ...vt, fontSize: 7, padding: '2px 1px' }}>株式の１株当たりの価額の計算</span>
                  </div>
                  <div style={{ flex: 3, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ ...vt, fontSize: 7, padding: '2px 1px' }}>株式の価額の修正</span>
                  </div>
                </div>

                {/* テーブルエリア */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ width: 65, ...br, ...hdr, textAlign: 'center', padding: '2px', letterSpacing: '0.5em', fontSize: 8 }}>区　分</div>
                    <div style={{ flex: 1, ...br, ...hdr, textAlign: 'center', padding: '2px', letterSpacing: '0.3em', fontSize: 8 }}>１株当たりの価額の算定方法</div>
                    <div style={{ width: 100, ...hdr, textAlign: 'center', padding: '2px', fontSize: 7.5 }}>１株当たりの価額</div>
                  </div>

                  {/* 大会社 */}
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ width: 65, ...br, ...hdr, padding: '3px', fontSize: 7.5, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.4 }}>
                      大 会 社 の<br />株式の価額
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 4px', fontSize: 7, lineHeight: 1.4 }}>
                      <div>次のうちいずれか低い方の金額（②の記載がないときは①の金額）</div>
                      <div style={{ paddingLeft: 8 }}>イ　①の金額</div>
                      <div style={{ paddingLeft: 8 }}>ロ　②の金額</div>
                    </div>
                    <div style={{ width: 100, padding: '2px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 8 }}>④</div>
                      <NumberField value={g('large_price')} onChange={(v) => u('large_price', v)} unit="円" />
                    </div>
                  </div>

                  {/* 中会社 */}
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ width: 65, ...br, ...hdr, padding: '3px', fontSize: 7.5, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.4 }}>
                      中 会 社 の<br />株式の価額
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 4px', fontSize: 7, lineHeight: 1.4 }}>
                      <div>（①と②とのいずれか低い方の金額 × Ｌの割合）＋（②の金額（③の金額が</div>
                      <div style={{ paddingLeft: 60 }}>あるときは③の金額）×（１－Ｌの割合））</div>
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 80, marginTop: 1 }}>
                        <span>Ｌの割合</span>
                        <NumberField value={g('l_ratio')} onChange={(v) => u('l_ratio', v)} className="w-12" />
                      </div>
                    </div>
                    <div style={{ width: 100, padding: '2px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 8 }}>⑤</div>
                      <NumberField value={g('medium_price')} onChange={(v) => u('medium_price', v)} unit="円" />
                    </div>
                  </div>

                  {/* 小会社 */}
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ width: 65, ...br, ...hdr, padding: '3px', fontSize: 7.5, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.4 }}>
                      小 会 社 の<br />株式の価額
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 4px', fontSize: 7, lineHeight: 1.4 }}>
                      <div>次のうちいずれか低い方の金額</div>
                      <div style={{ paddingLeft: 8 }}>イ　②の金額（③の金額があるときは③の金額）</div>
                      <div style={{ paddingLeft: 8 }}>ロ（①の金額 × 0.50）＋（イの金額 × 0.50）</div>
                    </div>
                    <div style={{ width: 100, padding: '2px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 8 }}>⑥</div>
                      <NumberField value={g('small_price')} onChange={(v) => u('small_price', v)} unit="円" />
                    </div>
                  </div>

                  {/* ⑦ 修正: 配当期待権 */}
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ flex: 1, ...br, padding: '2px 4px', fontSize: 7, lineHeight: 1.5 }}>
                      <div style={{ display: 'flex' }}>
                        <div style={{ minWidth: 100 }}>
                          <div>課税時期において</div>
                          <div>配当期待権の発生</div>
                          <div>している場合</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                          <div>
                            <div>株式の価額</div>
                            <div style={{ fontSize: 6.5 }}>（④、⑤又は⑥<br />の金額）</div>
                          </div>
                          <span style={{ fontSize: 12 }}>ー</span>
                          <div>
                            <div>１株当たりの</div>
                            <div>配当金額</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ width: 100, padding: '2px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 7 }}>
                      <div style={{ fontSize: 8 }}>⑦</div>
                      <div>修正後の株式の価額</div>
                      <NumberField value={g('modified_price_7')} onChange={(v) => u('modified_price_7', v)} unit="円" />
                    </div>
                  </div>

                  {/* ⑧ 修正: 割当て等 */}
                  <div style={{ display: 'flex' }}>
                    <div style={{ flex: 1, ...br, padding: '2px 4px', fontSize: 7, lineHeight: 1.5 }}>
                      <div style={{ display: 'flex' }}>
                        <div style={{ minWidth: 100 }}>
                          <div>課税時期において株式</div>
                          <div>の割当てを受ける権利、</div>
                          <div>株主となる権利又は</div>
                          <div>株式無償交付期待権の</div>
                          <div>発生している場合</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', fontSize: 6.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <div>
                              <div>株式の価額</div>
                              <div>（④、⑤又は⑥</div>
                              <div>(②があるときは②)</div>
                              <div>の金額）</div>
                            </div>
                            <span style={{ fontSize: 9 }}>×</span>
                            <div>
                              <div>割当株式１株当</div>
                              <div>たりの払込金額</div>
                            </div>
                            <span style={{ fontSize: 9 }}>×</span>
                            <div>
                              <div>１株当たりの</div>
                              <div>割当株式数</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 3, fontSize: 7 }}>
                            ÷（１株＋
                            <NumberField value={g('allotment_ratio')} onChange={(v) => u('allotment_ratio', v)} className="w-8" />
                            ）
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 2 }}>
                            <span>円</span>
                            <span>株</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ width: 100, padding: '2px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 7 }}>
                      <div style={{ fontSize: 8 }}>⑧</div>
                      <div>修正後の株式の価額</div>
                      <NumberField value={g('modified_price_8')} onChange={(v) => u('modified_price_8', v)} unit="円" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑨⑩⑪⑫⑬: 1株当たりの資本金等の額 */}
              <div style={{ display: 'flex', borderTop: '0.5px solid #000' }}>
                {/* 左ラベル */}
                <div style={{ width: 70, ...br, ...hdr, padding: '2px 3px', fontSize: 7, textAlign: 'center', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  １株当たりの<br />資本金等の額、<br />発行済株式数等
                </div>
                {/* 各項目 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: 'flex', ...bb, fontSize: 6.5, textAlign: 'center' }}>
                    <div style={{ flex: 1, ...br, padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
                      直前期末の<br />資本金等の額
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
                      直前期末の<br />発行済株式数
                    </div>
                    <div style={{ flex: 1, ...br, padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
                      直前期末の<br />自己株式数
                    </div>
                    <div style={{ flex: 1.3, ...br, padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
                      1株当たりの資本金等<br />の額を50円とした場合<br />の発行済株式数<br />（⑨÷50円）
                    </div>
                    <div style={{ flex: 1, padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
                      １株当たりの<br />資本金等の額<br />（⑨÷（⑩−⑪））
                    </div>
                  </div>
                  {/* 値行 */}
                  <div style={{ display: 'flex', fontSize: 7.5 }}>
                    <div style={{ flex: 1, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 2 }}>⑨</span>
                      <NumberField value={g('capital_amount')} onChange={(v) => u('capital_amount', v)} />
                      <span className="whitespace-nowrap ml-0.5">千円</span>
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 2 }}>⑩</span>
                      <NumberField value={g('issued_shares')} onChange={(v) => u('issued_shares', v)} />
                      <span className="whitespace-nowrap ml-0.5">株</span>
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 2 }}>⑪</span>
                      <NumberField value={g('treasury_shares')} onChange={(v) => u('treasury_shares', v)} />
                      <span className="whitespace-nowrap ml-0.5">株</span>
                    </div>
                    <div style={{ flex: 1.3, ...br, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 2 }}>⑫</span>
                      <NumberField value={g('shares_50yen')} onChange={(v) => u('shares_50yen', v)} />
                      <span className="whitespace-nowrap ml-0.5">株</span>
                    </div>
                    <div style={{ flex: 1, padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 2 }}>⑬</span>
                      <NumberField value={g('capital_per_share')} onChange={(v) => u('capital_per_share', v)} />
                      <span className="whitespace-nowrap ml-0.5">円</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======== セクション2: 配当還元方式による価額 ======== */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
            {/* セクション番号＋ラベル */}
            <div style={{ width: 26, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', fontSize: 8 }}>
              <span style={{ marginBottom: 4, fontWeight: 700 }}>２</span>
              <span style={{ ...vt, flex: 1 }}>配当還元方式による価額</span>
            </div>

            {/* セクション内容 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* 配当金額テーブル */}
              <div style={{ display: 'flex', ...bb }}>
                {/* サブラベル */}
                <div style={{ width: 48, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...vt, fontSize: 7, padding: '2px 1px' }}>直前期末以前２年間の配当金額</span>
                </div>
                {/* テーブル */}
                <div style={{ flex: 1 }}>
                  {/* ヘッダー */}
                  <div style={{ display: 'flex', ...bb, fontSize: 6.5, textAlign: 'center' }}>
                    <div style={{ width: 50, ...br, ...hdr, padding: '1px 2px' }}>事業年度</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px 2px' }}>⑭　年配当金額</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>⑮　左のうち非経常的な<br />配当金額</div>
                    <div style={{ flex: 1, ...br, ...hdr, padding: '1px 2px', lineHeight: 1.3 }}>⑯　差引経常的な年配当金額<br />（⑭ − ⑮）</div>
                    <div style={{ flex: 1, ...hdr, padding: '1px 2px' }}>年平均配当金額</div>
                  </div>
                  {/* 直前期 */}
                  <div style={{ display: 'flex', ...bb, fontSize: 7.5 }}>
                    <div style={{ width: 50, ...br, ...hdr, textAlign: 'center', padding: '2px', letterSpacing: '0.2em' }}>直 前 期</div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px' }}>
                      <NumberField value={g('div_prev1')} onChange={(v) => u('div_prev1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px' }}>
                      <NumberField value={g('div_extra1')} onChange={(v) => u('div_extra1', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 2 }}>イ</span>
                        <NumberField value={g('div_regular1')} onChange={(v) => u('div_regular1', v)} unit="千円" />
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '2px 3px', textAlign: 'center' }}>
                      <div style={{ fontSize: 6.5 }}>⑰　（イ＋ロ）÷２</div>
                      <NumberField value={g('avg_dividend')} onChange={(v) => u('avg_dividend', v)} unit="千円" />
                    </div>
                  </div>
                  {/* 直前々期 */}
                  <div style={{ display: 'flex', fontSize: 7.5 }}>
                    <div style={{ width: 50, ...br, ...hdr, textAlign: 'center', padding: '2px', letterSpacing: '0.1em' }}>直前々期</div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px' }}>
                      <NumberField value={g('div_prev2')} onChange={(v) => u('div_prev2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px' }}>
                      <NumberField value={g('div_extra2')} onChange={(v) => u('div_extra2', v)} unit="千円" />
                    </div>
                    <div style={{ flex: 1, ...br, padding: '2px 3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 2 }}>ロ</span>
                        <NumberField value={g('div_regular2')} onChange={(v) => u('div_regular2', v)} unit="千円" />
                      </div>
                    </div>
                    <div style={{ flex: 1 }} />
                  </div>
                </div>
              </div>

              {/* ⑱ 1株(50円)当たりの年配当金額 */}
              <div style={{ display: 'flex', ...bb, padding: '3px 6px', fontSize: 7.5, alignItems: 'center' }}>
                <span style={{ flex: 1 }}>
                  １株（50円）当たりの年配当金額　年平均配当金額（⑰の金額）÷⑫の株式数＝
                </span>
                <span style={{ marginRight: 4, fontWeight: 500, fontSize: 8 }}>⑱</span>
                <NumberField value={g('div_per_share')} onChange={(v) => u('div_per_share', v)} className="w-16" />
                <span style={{ marginLeft: 2 }}>円　銭</span>
                <span style={{ marginLeft: 10, fontSize: 6, border: '0.5px solid #000', padding: '1px 4px', lineHeight: 1.3 }}>
                  この金額が２円50銭未満<br />の場合は２円50銭としま<br />す。
                </span>
              </div>

              {/* ⑲⑳ 配当還元価額 */}
              <div style={{ display: 'flex', padding: '3px 6px', fontSize: 7.5, alignItems: 'center' }}>
                <span>配当還元価額</span>
                <span style={{ margin: '0 6px' }}>
                  <span style={{ textDecoration: 'underline' }}>⑱の金額</span>
                  <span style={{ margin: '0 2px' }}>×</span>
                  <span style={{ textDecoration: 'underline' }}>⑬の金額</span>
                </span>
                <span>=</span>
                <span style={{ margin: '0 2px', fontSize: 8 }}>⑲</span>
                <NumberField value={g('div_return_price')} onChange={(v) => u('div_return_price', v)} className="w-12" />
                <span style={{ marginLeft: 2 }}>円</span>
                <span style={{ margin: '0 6px', fontSize: 8 }}>⑳</span>
                <NumberField value={g('div_return_final')} onChange={(v) => u('div_return_final', v)} className="w-12" />
                <span style={{ marginLeft: 2 }}>円</span>
                <span style={{ marginLeft: 8, fontSize: 5.5, lineHeight: 1.3 }}>
                  ⑳の金額が、原則的評価<br />方式により計算した価額<br />を超える場合には、原則<br />的評価方式により計算し<br />た価額とします。
                </span>
              </div>
              <div style={{ padding: '0 6px 2px', fontSize: 6.5, display: 'flex', justifyContent: 'center', gap: 40 }}>
                <span>10%</span>
                <span>50円</span>
              </div>
            </div>
          </div>

          {/* ======== 下段: セクション3＋4 ======== */}
          <div style={{ display: 'flex' }}>

            {/* ---- 左: セクション3 ---- */}
            <div style={{ flex: 1, ...br, display: 'flex' }}>
              {/* セクション番号＋ラベル */}
              <div style={{ width: 26, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 1px', fontSize: 7 }}>
                <span style={{ marginBottom: 2, fontWeight: 700 }}>３</span>
                <span style={{ ...vt, fontSize: 6.5 }}>配当期待権</span>
                <div style={{ borderTop: '0.5px solid #000', width: '100%', marginTop: 2, marginBottom: 2 }} />
                <span style={{ ...vt, fontSize: 6.5, flex: 1 }}>株式に関する権利の価額</span>
                <div style={{ ...vt, fontSize: 6, marginTop: 2 }}>
                  （１．及び２．に共通）
                </div>
              </div>

              {/* 内容 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: 7 }}>
                {/* ㉑ 配当期待権 */}
                <div style={{ ...bb, padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>配当期待権</div>
                    <div style={{ fontSize: 6.5 }}>
                      １株当たりの予想配当金額<br />
                      （　　円　銭）（　　円　銭）
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 6.5, marginRight: 4 }}>
                    源泉徴収されるべき<br />所得税相当額
                  </div>
                  <span style={{ fontWeight: 500, marginRight: 2 }}>㉑</span>
                  <NumberField value={g('expected_dividend')} onChange={(v) => u('expected_dividend', v)} className="w-10" />
                  <span className="whitespace-nowrap ml-0.5" style={{ fontSize: 6.5 }}>円　銭</span>
                </div>

                {/* ㉒ 株式の割当てを受ける権利 */}
                <div style={{ ...bb, padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div>株式の割当てを受ける権利</div>
                    <div style={{ fontSize: 6 }}>（割当株式１株当たりの金額）</div>
                    <div style={{ fontSize: 6 }}>⑧（配当還元方式の場合は⑳）の金額</div>
                  </div>
                  <span style={{ fontWeight: 500, marginRight: 2 }}>㉒</span>
                  <NumberField value={g('right_allotment')} onChange={(v) => u('right_allotment', v)} className="w-10" />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>

                {/* ㉓ 株主となる権利 */}
                <div style={{ ...bb, padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div>株主となる権利</div>
                    <div style={{ fontSize: 6 }}>（割当株式１株当たりの金額）</div>
                    <div style={{ fontSize: 6 }}>⑧（配当還元方式の場合は⑳）の金額</div>
                    <div style={{ fontSize: 5.5 }}>（課税時期後にその株主となる権利につき払い込むべき金額があるときは、その金額を控除した金額）</div>
                  </div>
                  <span style={{ fontWeight: 500, marginRight: 2 }}>㉓</span>
                  <NumberField value={g('right_shareholder')} onChange={(v) => u('right_shareholder', v)} className="w-10" />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>

                {/* ㉔ 株式無償交付期待権 */}
                <div style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div>株式無償交付期待権</div>
                    <div style={{ fontSize: 6 }}>（交付される株式１株当たりの金額）</div>
                    <div style={{ fontSize: 6 }}>⑧（配当還元方式の場合は⑳）の金額</div>
                  </div>
                  <span style={{ fontWeight: 500, marginRight: 2 }}>㉔</span>
                  <NumberField value={g('right_free_allot')} onChange={(v) => u('right_free_allot', v)} className="w-10" />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>
              </div>
            </div>

            {/* ---- 右: セクション4 ---- */}
            <div style={{ width: '32%', display: 'flex', flexDirection: 'column', fontSize: 7.5 }}>
              <div style={{ padding: '3px 6px', fontWeight: 700, textAlign: 'center', ...bb, fontSize: 7.5 }}>
                ４．株式及び株式に関する<br />権利の価額<br />（１．及び２．に共通）
              </div>

              {/* 株式の評価額 (1つ目) */}
              <div style={{ flex: 1, ...bb, padding: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ textAlign: 'right' }}>株式の評価額</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                  <NumberField value={g('stock_value_1')} onChange={(v) => u('stock_value_1', v)} className="w-20" />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>
              </div>

              {/* 株式の評価額 (2つ目) */}
              <div style={{ flex: 1, ...bb, padding: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ textAlign: 'right' }}>株式の評価額</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                  <NumberField value={g('stock_value_2')} onChange={(v) => u('stock_value_2', v)} className="w-20" />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>
              </div>

              {/* 株式に関する権利の評価額 */}
              <div style={{ flex: 1, padding: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ textAlign: 'right' }}>株式に関する<br />権利の評価額</div>
                <div style={{ textAlign: 'right', fontSize: 6.5, marginTop: 2 }}>（円　銭）</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                  <NumberField value={g('rights_value')} onChange={(v) => u('rights_value', v)} className="w-20" />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
