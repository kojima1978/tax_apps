import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { FormField } from '@/components/ui/FormField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table2';

export function Table2({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <FormHeader
        title="第２表　特定の評価会社の判定の明細書"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
        showCompanyOnly
      />

      <div className="flex text-[9px]">
        {/* 左側：判定要素 */}
        <div className="flex-1 gov-cell-r">
          {/* ==================== 1. 比準要素数１の会社 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              1. 比準要素数１の会社
            </div>
            <table className="gov-table">
              <thead>
                <tr>
                  <th colSpan={2}>(１)直前期末を基とした判定要素</th>
                  <th colSpan={2}>(２)直前々期末を基とした判定要素</th>
                </tr>
                <tr>
                  <th>項 目</th>
                  <th>金 額</th>
                  <th>項 目</th>
                  <th>金 額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="gov-header text-left">第４表のB１の金額</td>
                  <td><NumberField value={g('b1_1')} onChange={(v) => u('b1_1', v)} unit="円銭" /></td>
                  <td className="gov-header text-left">第４表のB２の金額</td>
                  <td><NumberField value={g('b2_1')} onChange={(v) => u('b2_1', v)} unit="円銭" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">第４表のC１の金額</td>
                  <td><NumberField value={g('c1_1')} onChange={(v) => u('c1_1', v)} unit="円" /></td>
                  <td className="gov-header text-left">第４表のC２の金額</td>
                  <td><NumberField value={g('c2_1')} onChange={(v) => u('c2_1', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">第４表のD１の金額</td>
                  <td><NumberField value={g('d1_1')} onChange={(v) => u('d1_1', v)} unit="円" /></td>
                  <td className="gov-header text-left">第４表のD２の金額</td>
                  <td><NumberField value={g('d2_1')} onChange={(v) => u('d2_1', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left" colSpan={2}>
                    判 定　　該 当　・　非 該 当
                  </td>
                  <td colSpan={2}>
                    <NumberField value={g('hikaku_zero_count')} onChange={(v) => u('hikaku_zero_count', v)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 2. 株式等保有特定会社 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              2. 株式等保有特定会社
            </div>
            <table className="gov-table">
              <tbody>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={1} /> 総資産価額<br />（第５表の<CircledNumber n={1} />の金額）
                  </td>
                  <td><NumberField value={g('total_assets_2')} onChange={(v) => u('total_assets_2', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={2} /> 株式等の価額の合計額<br />（第５表のイの金額）
                  </td>
                  <td><NumberField value={g('stock_value_2')} onChange={(v) => u('stock_value_2', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={3} /> 株式等保有割合（<CircledNumber n={2} />／<CircledNumber n={1} />）
                  </td>
                  <td><NumberField value={g('stock_ratio_2')} onChange={(v) => u('stock_ratio_2', v)} unit="％" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left" colSpan={2}>
                    <div className="flex gap-4">
                      <span>判 定</span>
                      <span><CircledNumber n={3} />の割合が50％以上である（該当）</span>
                      <span>・</span>
                      <span><CircledNumber n={3} />の割合が50％未満である（非該当）</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 3. 土地保有特定会社 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              3. 土地保有特定会社
            </div>
            <table className="gov-table">
              <tbody>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={4} /> 総資産価額（第５表の<CircledNumber n={1} />の金額）
                  </td>
                  <td><NumberField value={g('total_assets_3')} onChange={(v) => u('total_assets_3', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={5} /> 土地等の価額の合計額（第５表のハの金額）
                  </td>
                  <td><NumberField value={g('land_value_3')} onChange={(v) => u('land_value_3', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={6} /> 土地保有割合（<CircledNumber n={5} />／<CircledNumber n={4} />）
                  </td>
                  <td><NumberField value={g('land_ratio_3')} onChange={(v) => u('land_ratio_3', v)} unit="％" /></td>
                </tr>
              </tbody>
            </table>

            {/* 土地保有判定基準 */}
            <div className="gov-cell-b px-1 py-0.5 text-[8px]">
              （総資産価額（帳簿価額）が次の基準に該当する会社）
            </div>
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th>会社の規模</th>
                  <th>大 会 社</th>
                  <th>中 会 社</th>
                  <th>小 会 社</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="gov-header">判定基準</td>
                  <td>
                    <div>・卸売業 20億円以上</div>
                    <div>・小売・サービス業 15億円以上</div>
                    <div>・上記以外の業種 15億円以上</div>
                  </td>
                  <td>
                    <div>・卸売業 7,000万円以上20億円未満</div>
                    <div>・小売・サービス業 4,000万円以上15億円未満</div>
                    <div>・上記以外の業種 5,000万円以上15億円未満</div>
                  </td>
                  <td>左記未満</td>
                </tr>
                <tr>
                  <td className="gov-header"><CircledNumber n={6} />の割合</td>
                  <td>70％以上</td>
                  <td>90％以上</td>
                  <td>
                    <div>大会社：70％以上</div>
                    <div>中会社：90％以上</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="px-1 py-0.5 text-center">
              判 定　　該 当　・　非該当
            </div>
          </div>
        </div>

        {/* 右側：判定結果 */}
        <div style={{ width: '30%' }}>
          {/* ==================== 4. 開業後３年未満の会社等 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              ４．開業後３年未満の会社等
            </div>
            <table className="gov-table">
              <tbody>
                <tr>
                  <td className="gov-header text-left">⑴ 開業後３年未満の会社</td>
                </tr>
                <tr>
                  <td className="text-left px-2">
                    <div>開業年月日</div>
                    <FormField value={g('opening_date')} onChange={(v) => u('opening_date', v)} placeholder="年 月 日" />
                  </td>
                </tr>
                <tr>
                  <td>判 定　　該 当　・　非 該 当</td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    ⑵ 比準要素数０の会社
                  </td>
                </tr>
                <tr>
                  <td className="text-left px-2">
                    <div>直前期末を基とした判定要素</div>
                    <div className="flex gap-2 mt-1">
                      <span>第４表のB１</span>
                      <NumberField value={g('b1_4')} onChange={(v) => u('b1_4', v)} className="w-16" unit="円銭" />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span>第４表のC１</span>
                      <NumberField value={g('c1_4')} onChange={(v) => u('c1_4', v)} className="w-16" unit="円" />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span>第４表のD１</span>
                      <NumberField value={g('d1_4')} onChange={(v) => u('d1_4', v)} className="w-16" unit="円" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>判 定　　該 当　・　非 該 当</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 5. 開業前又は休業中の会社 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              ５．開業前又は休業中の会社
            </div>
            <div className="p-1 text-center">
              <div>開業前の会社の判定　該 当　・　非該当</div>
              <div>休業中の会社の判定　該 当　・　非該当</div>
            </div>
          </div>

          {/* ==================== 6. 清算中の会社 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              ６．清 算 中 の 会 社
            </div>
            <div className="p-1 text-center">
              判 定　　該 当　・　非 該 当
            </div>
          </div>

          {/* ==================== 7. 特定の評価会社の判定結果 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              ７. 特定の評価会社の判定結果
            </div>
            <div className="p-2 text-[8px]">
              <div>１．比準要素数１の会社</div>
              <div>２．株式等保有特定会社</div>
              <div>３．土地保有特定会社</div>
              <div>４．開業後３年未満の会社等</div>
              <div>５．開業前又は休業中の会社</div>
              <div>６．清算中の会社</div>
              <div className="mt-1 text-[7px]">
                該当する番号を○で囲んでください。なお、上記の「１．」欄から「６．」欄の判定において２以上に該当する場合には、後の番号の判定によります。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 会社の規模の判定 */}
      <div className="gov-section">
        <div className="px-1 py-0.5 text-[9px]">
          <span className="font-bold">会社の規模の判定</span>
          <span className="ml-2">（該当する文字を○で囲んで表示します。）</span>
        </div>
        <div className="flex items-center justify-center gap-4 py-1 text-[9px]">
          <span className="gov-choice" onClick={() => u('company_size', '大会社')}>大会社</span>
          <span>・</span>
          <span className="gov-choice" onClick={() => u('company_size', '中会社')}>中会社</span>
          <span>・</span>
          <span className="gov-choice" onClick={() => u('company_size', '小会社')}>小会社</span>
        </div>
      </div>
    </div>
  );
}
