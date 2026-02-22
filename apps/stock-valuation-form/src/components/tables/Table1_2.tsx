import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { FormField } from '@/components/ui/FormField';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table1_2';

export function Table1_2({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <FormHeader
        title="第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
        showCompanyOnly
      />

      {/* ==================== 3. 会社の規模（Ｌの割合）の判定 ==================== */}
      <div className="gov-cell-b px-1 py-0.5">
        <span className="font-bold">３．会社の規模（Ｌの割合）の判定</span>
      </div>

      {/* 判定要素 */}
      <div className="gov-section">
        <table className="gov-table text-[9px]">
          <thead>
            <tr>
              <th colSpan={2}>項 目</th>
              <th>金 額</th>
              <th colSpan={2}>項 目</th>
              <th>人 数</th>
            </tr>
          </thead>
          <tbody>
            {/* 総資産価額 */}
            <tr>
              <td className="gov-header text-left" colSpan={2}>
                直前期末の総資産価額<br />(帳 簿 価 額)
              </td>
              <td>
                <NumberField value={g('total_assets')} onChange={(v) => u('total_assets', v)} unit="千円" />
              </td>
              <td className="gov-header text-left" colSpan={2} rowSpan={2}>
                <div>従業員数の内訳</div>
                <div className="text-[8px] mt-1">
                  直前期末以前１年間における従業員数
                </div>
              </td>
              <td rowSpan={2}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center">
                    <span className="text-[8px]">継続勤務従業員数</span>
                    <NumberField value={g('regular_emp')} onChange={(v) => u('regular_emp', v)} unit="人" className="w-16" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-[8px]">継続勤務従業員以外の従業員の労働時間の合計時間数</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[8px]">（</span>
                    <NumberField value={g('part_hours')} onChange={(v) => u('part_hours', v)} className="w-16" />
                    <span className="text-[8px]">時間）</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="gov-header text-left" colSpan={2}>
                直前期末以前１年間の取引金額
              </td>
              <td>
                <NumberField value={g('transaction_amount')} onChange={(v) => u('transaction_amount', v)} unit="千円" />
              </td>
            </tr>
            <tr>
              <td className="gov-header text-left" colSpan={2}>
                直前期末以前１年間における従業員数
              </td>
              <td colSpan={4}>
                <div className="flex items-center gap-1">
                  <span>（</span>
                  <NumberField value={g('emp_count_calc')} onChange={(v) => u('emp_count_calc', v)} className="w-12" />
                  <span>人）＋</span>
                  <NumberField value={g('emp_hours_div')} onChange={(v) => u('emp_hours_div', v)} className="w-16" />
                  <span>÷ 1,800時間 ＝</span>
                  <NumberField value={g('total_emp')} onChange={(v) => u('total_emp', v)} unit="人" className="w-12" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ト：70人以上判定 */}
      <div className="gov-section mt-0">
        <div className="gov-header gov-cell-b px-1 py-0.5 text-[9px]">
          ト　直前期末以前１年間における従業員数に応ずる区分
        </div>
        <div className="px-2 py-1 text-[9px] gov-cell-b">
          70人以上の会社は、大会社(チ及びリは不要）
        </div>
        <div className="px-2 py-1 text-[9px]">
          70人未満の会社は、チ及びリにより判定
        </div>
      </div>

      {/* チ・リ：会社規模マトリクス */}
      <div className="gov-section mt-0">
        <div className="flex gov-cell-b">
          <div className="gov-header gov-cell-r px-1 py-0.5 text-[9px]" style={{ width: '50%' }}>
            チ　直前期末の総資産価額（帳簿価額）及び直前期末以前１年間における従業員数に応ずる区分
          </div>
          <div className="gov-header px-1 py-0.5 text-[9px]" style={{ width: '50%' }}>
            リ　直前期末以前１年間の取引金額に応ずる区分
          </div>
        </div>

        <table className="gov-table text-[8px]">
          <thead>
            <tr>
              <th colSpan={4}>総 資 産 価 額 ( 帳 簿 価 額 ）</th>
              <th rowSpan={2}>従 業 員 数</th>
              <th colSpan={3}>取 引 金 額</th>
              <th rowSpan={2}>
                会社規模とＬの<br />割合（中会社）<br />の区分
              </th>
            </tr>
            <tr>
              <th>卸 売 業</th>
              <th>小売・サービス業</th>
              <th>卸売業、小売・<br />サービス業以外</th>
              <th>&nbsp;</th>
              <th>卸 売 業</th>
              <th>小売・サービス業</th>
              <th>卸売業、小売・<br />サービス業以外</th>
            </tr>
          </thead>
          <tbody>
            {/* 大会社 */}
            <tr>
              <td>20億円以上</td>
              <td>15億円以上</td>
              <td>15億円以上</td>
              <td rowSpan={2}>&nbsp;</td>
              <td>35 人 超</td>
              <td>30億円以上</td>
              <td>20億円以上</td>
              <td>15億円以上</td>
              <td className="font-bold">大 会 社</td>
            </tr>
            {/* 中会社の大 0.90 */}
            <tr>
              <td>４億円以上<br />20億円未満</td>
              <td>５億円以上<br />15億円未満</td>
              <td>５億円以上<br />15億円未満</td>
              <td>35 人 超</td>
              <td>７億円以上<br />30億円未満</td>
              <td>５億円以上<br />20億円未満</td>
              <td>４億円以上<br />15億円未満</td>
              <td>
                <div>中</div>
                <div>０．９０</div>
              </td>
            </tr>
            {/* 中会社の中 0.75 */}
            <tr>
              <td>２億円以上<br />４億円未満</td>
              <td>2億5,000万円以上<br />５億円未満</td>
              <td>2億5,000万円以上<br />５億円未満</td>
              <td>&nbsp;</td>
              <td>20 人 超<br />35 人 以 下</td>
              <td>3億5,000万円以上<br />７億円未満</td>
              <td>2億5,000万円以上<br />５億円未満</td>
              <td>２億円以上<br />４億円未満</td>
              <td>
                <div>会</div>
                <div>０．７５</div>
              </td>
            </tr>
            {/* 中会社の小 0.60 */}
            <tr>
              <td>7,000万円以上<br />２億円未満</td>
              <td>4,000万円以上<br />2億5,000万円未満</td>
              <td>5,000万円以上<br />2億5,000万円未満</td>
              <td>&nbsp;</td>
              <td>５ 人 超<br />20 人 以 下</td>
              <td>２億円以上<br />3億5,000万円未満</td>
              <td>6,000万円以上<br />2億5,000万円未満</td>
              <td>8,000万円以上<br />２億円未満</td>
              <td>
                <div>社</div>
                <div>０．６０</div>
              </td>
            </tr>
            {/* 小会社 */}
            <tr>
              <td>7,000万円未満</td>
              <td>4,000万円未満</td>
              <td>5,000万円未満</td>
              <td>&nbsp;</td>
              <td>５ 人 以 下</td>
              <td>２億円未満</td>
              <td>6,000万円未満</td>
              <td>8,000万円未満</td>
              <td className="font-bold">小 会 社</td>
            </tr>
          </tbody>
        </table>

        <div className="px-1 py-1 text-[8px]">
          ・「会社規模とＬの割合（中会社）の区分」欄は、チ欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか下位の区分）とリ欄（取引金額）の区分とのいずれか上位の区分により判定します。
        </div>
      </div>

      {/* 判定結果 */}
      <div className="gov-section mt-0">
        <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center text-[9px]">
          判 定
        </div>
        <table className="gov-table text-[9px]">
          <tbody>
            <tr>
              <td className="font-bold" style={{ width: '25%' }}>
                <span className="gov-choice" onClick={() => u('size_result', '大会社')}>
                  大 会 社
                </span>
              </td>
              <td colSpan={3}>
                <div className="flex items-center justify-center gap-4">
                  <span>Ｌ の 割 合</span>
                  <span className="gov-choice" onClick={() => u('size_result', '中0.90')}>０．９０</span>
                  <span className="gov-choice" onClick={() => u('size_result', '中0.75')}>０．７５</span>
                  <span className="gov-choice" onClick={() => u('size_result', '中0.60')}>０．６０</span>
                </div>
              </td>
              <td className="font-bold" style={{ width: '25%' }}>
                <span className="gov-choice" onClick={() => u('size_result', '小会社')}>
                  小 会 社
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ==================== 4. 増（減）資の状況その他 ==================== */}
      <div className="gov-section mt-0">
        <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-[9px]">
          ４．増（減）資の状況その他評価上の参考事項
        </div>
        <div style={{ minHeight: 60, padding: 4 }}>
          <FormField
            value={g('capital_changes')}
            onChange={(v) => u('capital_changes', v)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
