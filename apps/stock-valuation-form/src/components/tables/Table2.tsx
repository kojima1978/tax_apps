import { NumberField } from '@/components/ui/NumberField';
import { FormField } from '@/components/ui/FormField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table2';
const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;

export function Table2({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      {/* ===== タイトル行 ===== */}
      <div style={{ display: 'flex', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 11 }}>
          第２表　特定の評価会社の判定の明細書
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', ...bl }}>
          <span>会社名</span>
          <FormField value={g('companyName')} onChange={(v) => u('companyName', v)} className="w-32" />
        </div>
      </div>

      {/* ===== メインボディ ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* =============== 1. 比準要素数１の会社 =============== */}
          <div style={{ display: 'flex', ...bb }}>
            {/* 左: セクションラベル */}
            <div style={{ width: 85, ...br, display: 'flex', flexDirection: 'column', fontSize: 7.5 }}>
              <div style={{ padding: '2px 3px', fontWeight: 700, ...bb }}>
                １．比準要素数１の会社
              </div>
              <div style={{ flex: 1 }}></div>
            </div>
            {/* 中央: 判定要素 */}
            <div style={{ flex: 1, ...br }}>
              <div style={{ textAlign: 'center', fontWeight: 500, ...bb, padding: '1px 0', letterSpacing: '0.5em', fontSize: 8 }}>
                判　定　要　素
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {/* (1) 直前期末 */}
                <div style={{ ...br, fontSize: 7 }}>
                  <div style={{ textAlign: 'center', ...bb, padding: '1px 2px' }}>
                    （１）直前期末を基とした判定要素
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', ...bb }}>
                    <div style={{ ...br, textAlign: 'center', padding: '1px 1px', fontSize: 6.5 }}>
                      第４表の第４表の
                    </div>
                    <div style={{ ...br, textAlign: 'center', padding: '1px 1px', fontSize: 6.5 }}>
                      第４表の
                    </div>
                    <div style={{ textAlign: 'center', padding: '1px 1px', fontSize: 6.5 }}>
                      第４表の
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', ...bb }}>
                    <div style={{ ...br, textAlign: 'center', padding: '1px' }}>
                      <CircledNumber n={8} />の金額
                    </div>
                    <div style={{ ...br, textAlign: 'center', padding: '1px' }}>
                      <CircledNumber n={9} />の金額
                    </div>
                    <div style={{ textAlign: 'center', padding: '1px' }}>
                      <CircledNumber n={10} />の金額
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', ...bb }}>
                    <div style={{ ...br, textAlign: 'center', fontSize: 6.5, padding: '1px' }}>円　銭</div>
                    <div style={{ ...br, textAlign: 'center', fontSize: 6.5, padding: '1px' }}>円</div>
                    <div style={{ textAlign: 'center', fontSize: 6.5, padding: '1px' }}>円</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div style={{ ...br, minHeight: 18 }}>
                      <NumberField value={g('b1_1')} onChange={(v) => u('b1_1', v)} />
                    </div>
                    <div style={{ ...br, minHeight: 18 }}>
                      <NumberField value={g('c1_1')} onChange={(v) => u('c1_1', v)} />
                    </div>
                    <div style={{ minHeight: 18 }}>
                      <NumberField value={g('d1_1')} onChange={(v) => u('d1_1', v)} />
                    </div>
                  </div>
                </div>
                {/* (2) 直前々期末 */}
                <div style={{ fontSize: 7 }}>
                  <div style={{ textAlign: 'center', ...bb, padding: '1px 2px' }}>
                    （２）直前々期末を基とした判定要素
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', ...bb }}>
                    <div style={{ ...br, textAlign: 'center', padding: '1px 1px', fontSize: 6.5 }}>
                      第４表の
                    </div>
                    <div style={{ ...br, textAlign: 'center', padding: '1px 1px', fontSize: 6.5 }}>
                      第４表の
                    </div>
                    <div style={{ textAlign: 'center', padding: '1px 1px', fontSize: 6.5 }}>
                      第４表の
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', ...bb }}>
                    <div style={{ ...br, textAlign: 'center', padding: '1px' }}>
                      <CircledNumber n={8} />の金額
                    </div>
                    <div style={{ ...br, textAlign: 'center', padding: '1px' }}>
                      <CircledNumber n={9} />の金額
                    </div>
                    <div style={{ textAlign: 'center', padding: '1px' }}>
                      <CircledNumber n={10} />の金額
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', ...bb }}>
                    <div style={{ ...br, textAlign: 'center', fontSize: 6.5, padding: '1px' }}>円</div>
                    <div style={{ ...br, textAlign: 'center', fontSize: 6.5, padding: '1px' }}>円　銭</div>
                    <div style={{ textAlign: 'center', fontSize: 6.5, padding: '1px' }}>円</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div style={{ ...br, minHeight: 18 }}>
                      <NumberField value={g('b2_1')} onChange={(v) => u('b2_1', v)} />
                    </div>
                    <div style={{ ...br, minHeight: 18 }}>
                      <NumberField value={g('c2_1')} onChange={(v) => u('c2_1', v)} />
                    </div>
                    <div style={{ minHeight: 18 }}>
                      <NumberField value={g('d2_1')} onChange={(v) => u('d2_1', v)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 右: 判定基準・判定 */}
            <div style={{ width: 130, fontSize: 7, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...bb, padding: '2px 3px', flex: 1, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 500 }}>判定基準</div>
                <div>①欄のいずれか２の判定要素が０であり、かつ、②欄のいずれか２以上の判定要素が０</div>
                <div>である（該当）・でない（非該当）</div>
              </div>
              <div style={{ padding: '2px 3px', textAlign: 'center' }}>
                <span style={{ fontWeight: 500 }}>判定</span>
                <span style={{ marginLeft: 6 }}>該 当　・　非 該 当</span>
              </div>
            </div>
          </div>

          {/* =============== 2. 株式等保有特定会社 =============== */}
          <div style={{ display: 'flex', ...bb }}>
            {/* 左: セクションラベル */}
            <div style={{ width: 85, ...br, fontSize: 7.5, padding: '2px 3px', fontWeight: 700 }}>
              ２．株式等保有特定会社
            </div>
            {/* 中央: 判定要素 */}
            <div style={{ flex: 1, ...br }}>
              <div style={{ textAlign: 'center', fontWeight: 500, ...bb, padding: '1px 0', letterSpacing: '0.3em', fontSize: 8 }}>
                判　定　要　素
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', ...bb, fontSize: 7.5 }}>
                <div style={{ ...br, padding: '2px 4px' }}>
                  <div>総 資 産 価 額</div>
                  <div style={{ fontSize: 6.5 }}>（第５表の<CircledNumber n={1} />の金額）</div>
                </div>
                <div style={{ ...br, padding: '2px 4px' }}>
                  <div>株式等の価額の合計額</div>
                  <div style={{ fontSize: 6.5 }}>（第５表のイの金額）</div>
                </div>
                <div style={{ padding: '2px 4px', width: 70 }}>
                  <div>株式等保有割合</div>
                  <div style={{ fontSize: 6.5 }}>（<CircledNumber n={2} />/<CircledNumber n={1} />）</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', fontSize: 7.5 }}>
                <div style={{ ...br, display: 'flex', alignItems: 'center', padding: '1px 3px', minHeight: 20 }}>
                  <CircledNumber n={1} />
                  <NumberField value={g('total_assets_2')} onChange={(v) => u('total_assets_2', v)} />
                  <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
                </div>
                <div style={{ ...br, display: 'flex', alignItems: 'center', padding: '1px 3px', minHeight: 20 }}>
                  <CircledNumber n={2} />
                  <NumberField value={g('stock_value_2')} onChange={(v) => u('stock_value_2', v)} />
                  <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '1px 3px', width: 70 }}>
                  <CircledNumber n={3} />
                  <NumberField value={g('stock_ratio_2')} onChange={(v) => u('stock_ratio_2', v)} />
                  <span style={{ marginLeft: 1 }}>%</span>
                </div>
              </div>
            </div>
            {/* 右: 判定基準・判定 */}
            <div style={{ width: 130, fontSize: 7, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...bb, padding: '2px 3px', lineHeight: 1.3, flex: 1 }}>
                <div style={{ fontWeight: 500 }}>判定基準</div>
                <div><CircledNumber n={3} />の割合が</div>
                <div>50%以上である</div>
              </div>
              <div style={{ ...bb, padding: '2px 3px', lineHeight: 1.3, flex: 1 }}>
                <div><CircledNumber n={3} />の割合が</div>
                <div>50%未満である</div>
              </div>
              <div style={{ padding: '2px 3px', textAlign: 'center' }}>
                <span style={{ fontWeight: 500 }}>判定</span>
                <span style={{ marginLeft: 4 }}>該 当　・　非 該 当</span>
              </div>
            </div>
          </div>

          {/* =============== 3. 土地保有特定会社 =============== */}
          <div style={{ display: 'flex', ...bb }}>
            {/* 左: セクションラベル */}
            <div style={{ width: 85, ...br, fontSize: 7.5, padding: '2px 3px', fontWeight: 700 }}>
              ３．土地保有特定会社
            </div>
            {/* 中央+右: 判定要素・会社規模マトリクス */}
            <div style={{ flex: 1, fontSize: 7 }}>
              {/* 判定要素行 */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ flex: 1, ...br }}>
                  <div style={{ textAlign: 'center', fontWeight: 500, ...bb, padding: '1px 0', letterSpacing: '0.3em', fontSize: 8 }}>
                    判　定　要　素
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', ...bb, fontSize: 7 }}>
                    <div style={{ ...br, padding: '2px 3px' }}>
                      <div>総 資 産 価 額</div>
                      <div style={{ fontSize: 6.5 }}>（第５表の<CircledNumber n={1} />の金額）</div>
                    </div>
                    <div style={{ ...br, padding: '2px 3px' }}>
                      <div>土地等の価額の合計額</div>
                      <div style={{ fontSize: 6.5 }}>（第５表のハの金額）</div>
                    </div>
                    <div style={{ padding: '2px 3px', width: 65 }}>
                      <div>土地保有割合</div>
                      <div style={{ fontSize: 6.5 }}>（<CircledNumber n={5} />/<CircledNumber n={4} />）</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', fontSize: 7.5 }}>
                    <div style={{ ...br, display: 'flex', alignItems: 'center', padding: '1px 3px', minHeight: 18 }}>
                      <CircledNumber n={4} />
                      <NumberField value={g('total_assets_3')} onChange={(v) => u('total_assets_3', v)} />
                      <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
                    </div>
                    <div style={{ ...br, display: 'flex', alignItems: 'center', padding: '1px 3px', minHeight: 18 }}>
                      <CircledNumber n={5} />
                      <NumberField value={g('land_value_3')} onChange={(v) => u('land_value_3', v)} />
                      <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '1px 3px', width: 65 }}>
                      <CircledNumber n={6} />
                      <NumberField value={g('land_ratio_3')} onChange={(v) => u('land_ratio_3', v)} />
                      <span style={{ marginLeft: 1 }}>%</span>
                    </div>
                  </div>
                </div>
                {/* 会社の規模の判定 */}
                <div style={{ width: 130, fontSize: 7 }}>
                  <div style={{ padding: '2px 3px', ...bb, textAlign: 'center' }}>
                    <div>会 社 の 規 模 の 判 定</div>
                    <div style={{ fontSize: 6.5 }}>（該当する文字を○で囲んで表示します。）</div>
                  </div>
                  <div style={{ padding: '4px 3px', textAlign: 'center', ...bb }}>
                    大 会 社・中 会 社・小 会 社
                  </div>
                  <div style={{ padding: '2px 3px', fontSize: 6.5, textAlign: 'center' }}>
                    （総資産価額（帳簿価額）が次の基準に該当する会社）
                  </div>
                </div>
              </div>

              {/* 土地保有判定マトリクス */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ width: 30, ...br, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontSize: 7, writingMode: 'vertical-rl', textOrientation: 'mixed', background: '#f5f5f0', fontWeight: 500, letterSpacing: '0.15em' }}>
                  判定基準
                </div>
                <div style={{ flex: 1 }}>
                  <table className="gov-table" style={{ fontSize: 6.5 }}>
                    <thead>
                      <tr>
                        <th>会社の規模</th>
                        <th colSpan={2}>大　会　社</th>
                        <th colSpan={2}>中　会　社</th>
                        <th colSpan={2}>小　会　社</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td rowSpan={3} className="gov-header text-left" style={{ padding: '1px 2px', verticalAlign: 'top', width: 50 }}>
                          <div>・卸売業</div>
                          <div>・小売・サービス業</div>
                          <div>・上記以外の業種</div>
                        </td>
                        <td colSpan={2} style={{ textAlign: 'left', padding: '1px 2px', lineHeight: 1.3 }}>
                          <div>20億円以上</div>
                          <div>15億円以上</div>
                          <div>15億円以上</div>
                        </td>
                        <td colSpan={2} style={{ textAlign: 'left', padding: '1px 2px', lineHeight: 1.3 }}>
                          <div>左記未満</div>
                        </td>
                        <td style={{ textAlign: 'left', padding: '1px 2px', fontSize: 6, lineHeight: 1.3 }}>
                          <div>・卸売業</div>
                          <div>7,000万円以上20億円未満</div>
                          <div>・小売・サービス業</div>
                          <div>4,000万円以上15億円未満</div>
                          <div>・上記以外の業種</div>
                          <div>5,000万円以上15億円未満</div>
                        </td>
                        <td style={{ textAlign: 'left', padding: '1px 2px', fontSize: 6 }}>
                          左記未満
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: 40 }}>70%以上</td>
                        <td style={{ width: 40 }}>70%未満</td>
                        <td style={{ width: 40 }}>90%以上</td>
                        <td style={{ width: 40 }}>90%未満</td>
                        <td style={{ width: 40 }}>90%以上</td>
                        <td style={{ width: 40 }}>90%未満</td>
                      </tr>
                      <tr>
                        <td>該 当</td>
                        <td>非該当</td>
                        <td>該 当</td>
                        <td>非該当</td>
                        <td>該 当</td>
                        <td>非該当</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* =============== 4. 開業後３年未満の会社等 =============== */}
          <div style={{ display: 'flex', ...bb }}>
            {/* 左: セクションラベル */}
            <div style={{ width: 30, ...br, background: '#f5f5f0', writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 700, fontSize: 7, textAlign: 'center', padding: '2px 1px', letterSpacing: '0.1em' }}>
              開業後３年未満の会社等
            </div>
            {/* 中央 */}
            <div style={{ flex: 1, fontSize: 7 }}>
              {/* (1) 開業後３年未満 */}
              <div style={{ display: 'flex', ...bb }}>
                <div style={{ flex: 1, ...br }}>
                  <div style={{ padding: '1px 3px', ...bb, fontWeight: 500 }}>
                    ４
                  </div>
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ ...br, padding: '1px 3px', width: 70 }}>
                      <div style={{ fontWeight: 500 }}>（１）開 業 後 ３ 年</div>
                      <div>未 満 の 会 社</div>
                    </div>
                    <div style={{ padding: '1px 3px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>開業年月日</span>
                        <FormField value={g('opening_date_y')} onChange={(v) => u('opening_date_y', v)} className="w-6" textAlign="center" />
                        <span>年</span>
                        <FormField value={g('opening_date_m')} onChange={(v) => u('opening_date_m', v)} className="w-5" textAlign="center" />
                        <span>月</span>
                        <FormField value={g('opening_date_d')} onChange={(v) => u('opening_date_d', v)} className="w-5" textAlign="center" />
                        <span>日</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ width: 130 }}>
                  <div style={{ ...bb, padding: '1px 3px', fontSize: 6.5 }}>
                    <div style={{ fontWeight: 500 }}>判定基準</div>
                    <div>開業後３年未満である</div>
                  </div>
                  <div style={{ ...bb, padding: '1px 3px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 500 }}>判 定</span>
                  </div>
                  <div style={{ padding: '1px 3px', textAlign: 'center' }}>
                    該 当　・　非 該 当
                  </div>
                </div>
              </div>
              {/* (2) 比準要素数０の会社 */}
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, ...br }}>
                  <div style={{ display: 'flex', ...bb }}>
                    <div style={{ ...br, padding: '1px 3px', width: 70 }}>
                      <div style={{ fontWeight: 500 }}>（２）比 準 要 素 数</div>
                      <div>０ の 会 社</div>
                    </div>
                    <div style={{ padding: '1px 3px', flex: 1, fontSize: 6.5 }}>
                      <div>直前期末を基とした判定要素</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginTop: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 6, whiteSpace: 'nowrap' }}>第４表の<CircledNumber n={8} />の金額</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 6, whiteSpace: 'nowrap' }}>第４表の<CircledNumber n={9} />の金額</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 6, whiteSpace: 'nowrap' }}>第４表の<CircledNumber n={10} />の金額</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginTop: 1 }}>
                        <div style={{ ...br, minHeight: 14 }}>
                          <NumberField value={g('b1_4')} onChange={(v) => u('b1_4', v)} />
                        </div>
                        <div style={{ ...br, minHeight: 14 }}>
                          <NumberField value={g('c1_4')} onChange={(v) => u('c1_4', v)} />
                        </div>
                        <div style={{ minHeight: 14 }}>
                          <NumberField value={g('d1_4')} onChange={(v) => u('d1_4', v)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 1 }}>
                        <span>判定:</span>
                        <span>判定要素がいずれも０</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ width: 130 }}>
                  <div style={{ ...bb, padding: '1px 3px', fontSize: 6.5, lineHeight: 1.3 }}>
                    <div>直前期末を基とした判定要素がいずれも０</div>
                    <div>である（該当）・でない（非該当）</div>
                  </div>
                  <div style={{ padding: '1px 3px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 500 }}>判定</span>
                    <span style={{ marginLeft: 4 }}>該 当　・　非 該 当</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =============== 5 & 6: 開業前/休業中 + 清算中 =============== */}
          <div style={{ display: 'flex', ...bb }}>
            {/* 5. 開業前又は休業中の会社 */}
            <div style={{ flex: 1, ...br, fontSize: 7 }}>
              <div style={{ padding: '1px 3px', fontWeight: 700, ...bb }}>
                ５．開業前又は休業中の会社
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ ...br, padding: '2px 3px', textAlign: 'center' }}>
                  <div>開業前の会社の判定</div>
                  <div>該 当　・　非該当</div>
                </div>
                <div style={{ padding: '2px 3px', textAlign: 'center' }}>
                  <div>休業中の会社の判定</div>
                  <div>該 当　・　非該当</div>
                </div>
              </div>
            </div>
            {/* 6. 清算中の会社 */}
            <div style={{ flex: 1, fontSize: 7 }}>
              <div style={{ padding: '1px 3px', fontWeight: 700, ...bb }}>
                ６．清 算 中 の 会 社
              </div>
              <div style={{ padding: '2px 3px', textAlign: 'center' }}>
                <span style={{ fontWeight: 500 }}>判 定</span>
                <span style={{ marginLeft: 6 }}>該 当　・　非 該 当</span>
              </div>
            </div>
          </div>

          {/* =============== 7. 特定の評価会社の判定結果 =============== */}
          <div style={{ fontSize: 7, flex: 1 }}>
            <div style={{ padding: '2px 4px', fontWeight: 700, ...bb }}>
              ７．特定の評価会社の判定結果
            </div>
            <div style={{ padding: '3px 8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <div>１．比準要素数１の会社</div>
                <div>２．株式等保有特定会社</div>
                <div>３．土地保有特定会社</div>
                <div>４．開業後３年未満の会社等</div>
                <div>５．開業前又は休業中の会社</div>
                <div>６．清算中の会社</div>
              </div>
              <div style={{ marginTop: 4, fontSize: 6.5, lineHeight: 1.3, border: '0.5px solid #000', padding: '2px 4px' }}>
                該当する番号を○で囲んでください。なお、上記の「１．比準要素数１の会社」欄から「６．清算中の会社」欄の判定において２以上に該当する場合には、後の番号の判定によります。
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
