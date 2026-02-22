import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table7_8';

export function Table7_8({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="space-y-4">
      {/* ==================== 第７表 ==================== */}
      <div className="gov-form">
        <FormHeader
          title="第７表　株式等保有特定会社の株式の価額の計算明細書"
          getField={(f) => g(f)}
          updateField={(f, v) => u(f, v)}
          showCompanyOnly
        />

        <div className="flex text-[9px]">
          <div className="gov-side-header gov-cell-r" style={{ width: 22, minHeight: 400 }}>
            取引相場のない株式（出資）の評価明細書
          </div>

          <div className="flex-1">
            {/* 1. 受取配当金等収受割合の計算 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                １．受取配当金等収受割合の計算
              </div>
              <table className="gov-table text-[8px]">
                <thead>
                  <tr>
                    <th>事業年度</th>
                    <th><CircledNumber n={1} /> 直 前 期</th>
                    <th><CircledNumber n={2} /> 直 前 々 期</th>
                    <th>合計（<CircledNumber n={1} />＋<CircledNumber n={2} />）</th>
                    <th>受取配当金等収受割合<br />（イ÷（イ＋ロ））</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="gov-header text-left">受取配当金等の額</td>
                    <td><NumberField value={g('div_income_y1')} onChange={(v) => u('div_income_y1', v)} unit="千円" /></td>
                    <td><NumberField value={g('div_income_y2')} onChange={(v) => u('div_income_y2', v)} unit="千円" /></td>
                    <td>イ <NumberField value={g('div_income_total')} onChange={(v) => u('div_income_total', v)} unit="千円" className="w-16" /></td>
                    <td rowSpan={2}>
                      <div>ハ</div>
                      <NumberField value={g('div_receipt_ratio')} onChange={(v) => u('div_receipt_ratio', v)} />
                      <div className="text-[7px]">※小数点以下３位未満切り捨て</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">営業利益の金額</td>
                    <td><NumberField value={g('operating_profit_y1')} onChange={(v) => u('operating_profit_y1', v)} unit="千円" /></td>
                    <td><NumberField value={g('operating_profit_y2')} onChange={(v) => u('operating_profit_y2', v)} unit="千円" /></td>
                    <td>ロ <NumberField value={g('operating_profit_total')} onChange={(v) => u('operating_profit_total', v)} unit="千円" className="w-16" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* S1の比準要素の修正 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                Ｓ１の金額の計算に係る比準要素の修正
              </div>
              <table className="gov-table text-[8px]">
                <tbody>
                  <tr>
                    <td className="gov-header text-left" style={{ width: '35%' }}>
                      <CircledNumber n={3} /> 1株(50円)当たりの年配当金額（第４表のＢ）
                    </td>
                    <td>
                      <NumberField value={g('s1_b_orig')} onChange={(v) => u('s1_b_orig', v)} unit="円銭" />
                    </td>
                    <td className="gov-header text-left">
                      <CircledNumber n={4} /> ｂの金額（<CircledNumber n={3} />×ハ）
                    </td>
                    <td>
                      <NumberField value={g('s1_b_adj')} onChange={(v) => u('s1_b_adj', v)} unit="円銭" />
                    </td>
                    <td className="gov-header text-left">
                      <CircledNumber n={5} /> Ｂ－ｂの金額
                    </td>
                    <td>
                      <NumberField value={g('s1_b_diff')} onChange={(v) => u('s1_b_diff', v)} unit="円銭" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={6} /> 1株(50円)当たりの年利益金額（第４表のＣ）
                    </td>
                    <td>
                      <NumberField value={g('s1_c_orig')} onChange={(v) => u('s1_c_orig', v)} unit="円" />
                    </td>
                    <td className="gov-header text-left">
                      <CircledNumber n={7} /> ｃの金額（<CircledNumber n={6} />×ハ）
                    </td>
                    <td>
                      <NumberField value={g('s1_c_adj')} onChange={(v) => u('s1_c_adj', v)} unit="円" />
                    </td>
                    <td className="gov-header text-left">
                      <CircledNumber n={8} /> Ｃ－ｃの金額
                    </td>
                    <td>
                      <NumberField value={g('s1_c_diff')} onChange={(v) => u('s1_c_diff', v)} unit="円" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* D要素の修正 */}
              <table className="gov-table text-[8px]">
                <tbody>
                  <tr>
                    <td className="gov-header text-left" style={{ width: '25%' }}>
                      （イ）1株(50円)当たりの純資産価額（第４表のＤ）
                    </td>
                    <td>
                      <NumberField value={g('s1_d_orig')} onChange={(v) => u('s1_d_orig', v)} unit="円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={9} /> 直前期末の総資産価額(帳簿価額）
                    </td>
                    <td>
                      <NumberField value={g('s1_total_assets')} onChange={(v) => u('s1_total_assets', v)} unit="千円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={10} /> 直前期末の株式等の帳簿価額の合計額
                    </td>
                    <td>
                      <NumberField value={g('s1_stock_book')} onChange={(v) => u('s1_stock_book', v)} unit="千円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={11} /> 1株当たりの資本金等の額を50円とした場合の発行済株式数
                    </td>
                    <td>
                      <NumberField value={g('s1_shares_50')} onChange={(v) => u('s1_shares_50', v)} unit="株" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      （ロ）の金額（（<CircledNumber n={9} />×（<CircledNumber n={10} />÷<CircledNumber n={11} />））×ハ）
                    </td>
                    <td>
                      <NumberField value={g('s1_d_adj_ro')} onChange={(v) => u('s1_d_adj_ro', v)} unit="円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={12} /> 利益積立金額
                    </td>
                    <td>
                      <NumberField value={g('s1_retained')} onChange={(v) => u('s1_retained', v)} unit="千円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={13} /> ｄの金額（<CircledNumber n={12} />＋<CircledNumber n={15} />）
                    </td>
                    <td>
                      <NumberField value={g('s1_d_val')} onChange={(v) => u('s1_d_val', v)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={17} /> Ｄ－ｄの金額（<CircledNumber n={9} />－<CircledNumber n={16} />）
                    </td>
                    <td>
                      <NumberField value={g('s1_d_diff')} onChange={(v) => u('s1_d_diff', v)} unit="円" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* S1の類似業種比準価額 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                Ｓ１の修正後の類似業種比準価額の計算
              </div>
              <table className="gov-table text-[8px]">
                <thead>
                  <tr>
                    <th rowSpan={2}>類似業種と<br />業種目番号</th>
                    <th rowSpan={2}>区 分</th>
                    <th colSpan={2}>類似業種の株価</th>
                    <th colSpan={3}>1株(50円)当たりの比準価額</th>
                  </tr>
                  <tr>
                    <th>Ａ 円</th>
                    <th>&nbsp;</th>
                    <th>(<CircledNumber n={5} />) 円銭</th>
                    <th>(<CircledNumber n={8} />) 円</th>
                    <th>(<CircledNumber n={17} />) 円</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowSpan={5}>
                      <NumberField value={g('s1_industry_no')} onChange={(v) => u('s1_industry_no', v)} className="w-12" />
                    </td>
                    <td>課税時期の属する月 ニ</td>
                    <td><NumberField value={g('s1_price_ni')} onChange={(v) => u('s1_price_ni', v)} /></td>
                    <td rowSpan={5}>
                      <div>比準割合</div>
                      <div>Ｂ ・ Ｃ ・ Ｄ ・</div>
                    </td>
                    <td rowSpan={5}>
                      <NumberField value={g('s1_eval_b')} onChange={(v) => u('s1_eval_b', v)} />
                    </td>
                    <td rowSpan={5}>
                      <NumberField value={g('s1_eval_c')} onChange={(v) => u('s1_eval_c', v)} />
                    </td>
                    <td rowSpan={5}>
                      <NumberField value={g('s1_eval_d')} onChange={(v) => u('s1_eval_d', v)} />
                    </td>
                  </tr>
                  <tr>
                    <td>属する月の前月 ホ</td>
                    <td><NumberField value={g('s1_price_ho')} onChange={(v) => u('s1_price_ho', v)} /></td>
                  </tr>
                  <tr>
                    <td>属する月の前々月 ヘ</td>
                    <td><NumberField value={g('s1_price_he')} onChange={(v) => u('s1_price_he', v)} /></td>
                  </tr>
                  <tr>
                    <td>前年平均株価 ト</td>
                    <td><NumberField value={g('s1_price_to')} onChange={(v) => u('s1_price_to', v)} /></td>
                  </tr>
                  <tr>
                    <td>課税時期の属する月以前２年間の平均株価 チ</td>
                    <td><NumberField value={g('s1_price_chi')} onChange={(v) => u('s1_price_chi', v)} /></td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="font-bold">
                      Ａ 最も低いもの <CircledNumber n={18} />
                    </td>
                    <td><NumberField value={g('s1_price_a')} onChange={(v) => u('s1_price_a', v)} /></td>
                    <td colSpan={4}>
                      <div className="flex items-center gap-1">
                        <span>比準割合 ＝</span>
                        <CircledNumber n={19} /> <CircledNumber n={20} />
                        <NumberField value={g('s1_ratio')} onChange={(v) => u('s1_ratio', v)} unit="円銭" className="w-16" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 比準価額の計算 */}
              <table className="gov-table text-[8px]">
                <tbody>
                  <tr>
                    <td className="text-left px-1">
                      1株当たりの比準価額（<CircledNumber n={20} />と㉓とのいずれか低い方の金額）× 第４表の<CircledNumber n={4} />の金額 ÷ 50円
                    </td>
                    <td style={{ width: '15%' }}>
                      <div>㉔</div>
                      <NumberField value={g('s1_hikijun')} onChange={(v) => u('s1_hikijun', v)} unit="円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="text-left px-1">
                      直前期末の翌日から課税時期までの間に配当金交付の効力が発生した場合（㉔の金額）－ 配当金額
                    </td>
                    <td>
                      <div>㉕ 修正比準価額</div>
                      <NumberField value={g('s1_modified')} onChange={(v) => u('s1_modified', v)} unit="円" />
                    </td>
                  </tr>
                  <tr>
                    <td className="text-left px-1">
                      直前期末の翌日から課税時期までの間に株式の割当て等の効力が発生した場合
                    </td>
                    <td>
                      <div>㉖</div>
                      <NumberField value={g('s1_modified2')} onChange={(v) => u('s1_modified2', v)} unit="円" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 第８表 ==================== */}
      <div className="gov-form">
        <FormHeader
          title="第８表　株式等保有特定会社の株式の価額の計算明細書（続）"
          getField={(f) => g(f)}
          updateField={(f, v) => u(f, v)}
          showCompanyOnly
        />

        <div className="flex text-[9px]">
          <div className="gov-side-header gov-cell-r" style={{ width: 22, minHeight: 400 }}>
            取引相場のない株式（出資）の評価明細書
          </div>

          <div className="flex-1">
            {/* S1の純資産価額の修正計算 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                Ｓ１の純資産価額（相続税評価額）の修正計算
              </div>
              <table className="gov-table text-[8px]">
                <tbody>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={1} /> 相続税評価額による純資産価額（第５表の<CircledNumber n={5} />の金額）
                    </td>
                    <td><NumberField value={g('s1_net_eval')} onChange={(v) => u('s1_net_eval', v)} unit="千円" /></td>
                    <td className="gov-header text-left">
                      <CircledNumber n={2} /> 課税時期現在の株式等の価額の合計額（第５表のイの金額）
                    </td>
                    <td><NumberField value={g('s1_stock_eval')} onChange={(v) => u('s1_stock_eval', v)} unit="千円" /></td>
                    <td className="gov-header text-left">
                      <CircledNumber n={3} /> 差引（<CircledNumber n={1} />－<CircledNumber n={2} />）
                    </td>
                    <td><NumberField value={g('s1_diff_1')} onChange={(v) => u('s1_diff_1', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={4} /> 帳簿価額による純資産価額（第５表の<CircledNumber n={6} />の金額）
                    </td>
                    <td><NumberField value={g('s1_net_book')} onChange={(v) => u('s1_net_book', v)} unit="千円" /></td>
                    <td className="gov-header text-left">
                      <CircledNumber n={5} /> 株式等の帳簿価額の合計額
                    </td>
                    <td><NumberField value={g('s1_stock_book2')} onChange={(v) => u('s1_stock_book2', v)} unit="千円" /></td>
                    <td className="gov-header text-left">
                      <CircledNumber n={6} /> 差引（<CircledNumber n={4} />－<CircledNumber n={5} />）
                    </td>
                    <td><NumberField value={g('s1_diff_2')} onChange={(v) => u('s1_diff_2', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left" colSpan={2}>
                      <CircledNumber n={7} /> 評価差額に相当する金額（<CircledNumber n={3} />－<CircledNumber n={6} />）
                    </td>
                    <td><NumberField value={g('s1_eval_diff')} onChange={(v) => u('s1_eval_diff', v)} unit="千円" /></td>
                    <td className="gov-header text-left" colSpan={2}>
                      <CircledNumber n={8} /> 評価差額に対する法人税額等相当額（<CircledNumber n={7} />×37％）
                    </td>
                    <td><NumberField value={g('s1_corp_tax')} onChange={(v) => u('s1_corp_tax', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left" colSpan={2}>
                      <CircledNumber n={9} /> 課税時期現在の修正純資産価額（相続税評価額）（<CircledNumber n={3} />－<CircledNumber n={8} />）
                    </td>
                    <td><NumberField value={g('s1_modified_net')} onChange={(v) => u('s1_modified_net', v)} unit="千円" /></td>
                    <td className="gov-header text-left" colSpan={2}>
                      <CircledNumber n={10} /> 課税時期現在の発行済株式数（第５表の<CircledNumber n={10} />の株式数）
                    </td>
                    <td><NumberField value={g('s1_shares')} onChange={(v) => u('s1_shares', v)} unit="株" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left" colSpan={5}>
                      <CircledNumber n={11} /> 課税時期現在の修正後の1株当たりの純資産価額(相続税評価額)（<CircledNumber n={9} />÷<CircledNumber n={10} />）
                    </td>
                    <td><NumberField value={g('s1_net_per_share')} onChange={(v) => u('s1_net_per_share', v)} unit="円" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* S1の金額の計算 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                Ｓ１の金額の計算
              </div>
              <table className="gov-table text-[8px]">
                <thead>
                  <tr>
                    <th colSpan={2}>
                      修正後の類似業種比準価額（第７表の㉔、㉕又は㉖の金額）
                    </th>
                    <th>
                      修正後の1株当たりの純資産価額（相続税評価額）（<CircledNumber n={11} />の金額）
                    </th>
                    <th>
                      1株当たりのＳ1の金額の算定方法
                    </th>
                    <th>1株当たりのＳ1の金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={2}>
                      <CircledNumber n={12} />
                      <NumberField value={g('s1_ruiji')} onChange={(v) => u('s1_ruiji', v)} unit="円" />
                    </td>
                    <td>
                      <CircledNumber n={13} />
                      <NumberField value={g('s1_net_val')} onChange={(v) => u('s1_net_val', v)} unit="円" />
                    </td>
                    <td colSpan={2} rowSpan={5}>
                      <div className="text-left px-1 space-y-2">
                        <div>
                          <div className="font-bold">比準要素数１である会社のＳ1の金額</div>
                          <div className="ml-2">イ <CircledNumber n={13} />の金額</div>
                          <div className="ml-2">ロ （<CircledNumber n={12} />の金額×0.25）＋（<CircledNumber n={13} />の金額×0.75）</div>
                          <div><CircledNumber n={14} /> <NumberField value={g('s1_result_14')} onChange={(v) => u('s1_result_14', v)} unit="円" className="w-20" /></div>
                        </div>
                        <div>
                          <div className="font-bold">大会社のＳ1の金額</div>
                          <div><CircledNumber n={15} /> <NumberField value={g('s1_result_15')} onChange={(v) => u('s1_result_15', v)} unit="円" className="w-20" /></div>
                        </div>
                        <div>
                          <div className="font-bold">中会社のＳ1の金額</div>
                          <div><CircledNumber n={16} /> <NumberField value={g('s1_result_16')} onChange={(v) => u('s1_result_16', v)} unit="円" className="w-20" /></div>
                        </div>
                        <div>
                          <div className="font-bold">小会社のＳ1の金額</div>
                          <div><CircledNumber n={17} /> <NumberField value={g('s1_result_17')} onChange={(v) => u('s1_result_17', v)} unit="円" className="w-20" /></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* S2の金額の計算 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                ２．Ｓ２の金額の計算
              </div>
              <table className="gov-table text-[8px]">
                <tbody>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={18} /> 課税時期現在の株式等の価額の合計額（第５表のイの金額）
                    </td>
                    <td><NumberField value={g('s2_stock_eval')} onChange={(v) => u('s2_stock_eval', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={19} /> 株式等の帳簿価額の合計額(第５表のロ＋(ニ－ホ)の金額)
                    </td>
                    <td><NumberField value={g('s2_stock_book')} onChange={(v) => u('s2_stock_book', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      <CircledNumber n={20} /> 株式等に係る評価差額に相当する金額（<CircledNumber n={18} />－<CircledNumber n={19} />）
                    </td>
                    <td><NumberField value={g('s2_diff')} onChange={(v) => u('s2_diff', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      ㉑ <CircledNumber n={20} />の評価差額に対する法人税額等相当額（<CircledNumber n={20} />×37％）
                    </td>
                    <td><NumberField value={g('s2_corp_tax')} onChange={(v) => u('s2_corp_tax', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      ㉒ Ｓ２の純資産価額相当額（<CircledNumber n={18} />－㉑）
                    </td>
                    <td><NumberField value={g('s2_net')} onChange={(v) => u('s2_net', v)} unit="千円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      ㉓ 課税時期現在の発行済株式数（第５表の<CircledNumber n={10} />の株式数）
                    </td>
                    <td><NumberField value={g('s2_shares')} onChange={(v) => u('s2_shares', v)} unit="株" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      ㉔ Ｓ２の金額（㉒÷㉓）
                    </td>
                    <td><NumberField value={g('s2_result')} onChange={(v) => u('s2_result', v)} unit="円" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. 株式等保有特定会社の株式の価額 */}
            <div className="gov-section">
              <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
                ３．株式等保有特定会社の株式の価額
              </div>
              <table className="gov-table text-[8px]">
                <tbody>
                  <tr>
                    <td className="gov-header text-left" style={{ width: '35%' }}>
                      ㉕ Ｓ1の金額とＳ2の金額との合計額（（<CircledNumber n={14} />、<CircledNumber n={15} />、<CircledNumber n={16} />又は<CircledNumber n={17} />）＋㉔）
                    </td>
                    <td><NumberField value={g('total_s1_s2')} onChange={(v) => u('total_s1_s2', v)} unit="円" /></td>
                  </tr>
                  <tr>
                    <td className="gov-header text-left">
                      ㉖ 1株当たりの純資産価額（第５表の<CircledNumber n={11} />の金額（第５表の<CircledNumber n={12} />の金額がある場合はその金額））
                    </td>
                    <td><NumberField value={g('net_asset_ref')} onChange={(v) => u('net_asset_ref', v)} unit="円" /></td>
                  </tr>
                  <tr className="font-bold">
                    <td className="gov-header text-left">
                      ㉗ 株式等保有特定会社の株式の価額（㉕と㉖とのいずれか低い方の金額）
                    </td>
                    <td><NumberField value={g('final_price')} onChange={(v) => u('final_price', v)} unit="円" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
