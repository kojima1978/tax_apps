import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table4';

export function Table4({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <FormHeader
        title="第４表　類似業種比準価額等の計算明細書"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
        showCompanyOnly
      />

      <div className="flex text-[9px]">
        <div className="gov-side-header gov-cell-r" style={{ width: 22, minHeight: 500 }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        <div className="flex-1">
          {/* ==================== 1. 1株当たりの資本金等の額等の計算 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              １．１株当たりの資本金等の額等の計算
            </div>
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th>直前期末の<br />資本金等の額</th>
                  <th>直前期末の<br />発行済株式数</th>
                  <th>直前期末の<br />自己株式数</th>
                  <th>1株当たりの資本金等の額<br />（<CircledNumber n={1} />÷（<CircledNumber n={2} />－<CircledNumber n={3} />））</th>
                  <th>1株当たりの資本金等の額を50円<br />とした場合の発行済株式数<br />（<CircledNumber n={1} />÷50円）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div><CircledNumber n={1} /></div>
                    <NumberField value={g('capital')} onChange={(v) => u('capital', v)} unit="千円" />
                  </td>
                  <td>
                    <div><CircledNumber n={2} /></div>
                    <NumberField value={g('issued_shares')} onChange={(v) => u('issued_shares', v)} unit="株" />
                  </td>
                  <td>
                    <div><CircledNumber n={3} /></div>
                    <NumberField value={g('treasury_shares')} onChange={(v) => u('treasury_shares', v)} unit="株" />
                  </td>
                  <td>
                    <div><CircledNumber n={4} /></div>
                    <NumberField value={g('capital_per_share')} onChange={(v) => u('capital_per_share', v)} unit="円" />
                  </td>
                  <td>
                    <div><CircledNumber n={5} /></div>
                    <NumberField value={g('shares_50yen')} onChange={(v) => u('shares_50yen', v)} unit="株" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 2. 比準要素等の金額の計算 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              ２．比準要素等の金額の計算
            </div>

            {/* 配当金額(B) */}
            <div className="gov-cell-b px-1 py-0.5 gov-header text-[8px]">
              直前期末以前２(３)年間の年平均配当金額
            </div>
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th>事業年度</th>
                  <th><CircledNumber n={6} /> 年配当金額</th>
                  <th><CircledNumber n={7} /> 左のうち非経常的な配当金額</th>
                  <th><CircledNumber n={8} /> 差引経常的な年配当金額<br />（<CircledNumber n={6} />－<CircledNumber n={7} />）</th>
                  <th>年平均配当金額</th>
                  <th>1株(50円)当たり<br />の年配当金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>直 前 期</td>
                  <td><NumberField value={g('div_y1')} onChange={(v) => u('div_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_extra_y1')} onChange={(v) => u('div_extra_y1', v)} unit="千円" /></td>
                  <td>
                    <span>イ</span>
                    <NumberField value={g('div_reg_y1')} onChange={(v) => u('div_reg_y1', v)} unit="千円" className="w-14" />
                  </td>
                  <td rowSpan={2}>
                    <div><CircledNumber n={9} />(イ＋ロ）÷２</div>
                    <NumberField value={g('avg_div')} onChange={(v) => u('avg_div', v)} unit="千円" />
                  </td>
                  <td>
                    <div>B１</div>
                    <NumberField value={g('b1')} onChange={(v) => u('b1', v)} unit="円銭" />
                  </td>
                </tr>
                <tr>
                  <td>直前々期</td>
                  <td><NumberField value={g('div_y2')} onChange={(v) => u('div_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_extra_y2')} onChange={(v) => u('div_extra_y2', v)} unit="千円" /></td>
                  <td>
                    <span>ロ</span>
                    <NumberField value={g('div_reg_y2')} onChange={(v) => u('div_reg_y2', v)} unit="千円" className="w-14" />
                  </td>
                  <td>
                    <div>B２</div>
                    <NumberField value={g('b2')} onChange={(v) => u('b2', v)} unit="円銭" />
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right">
                    <span>Ｂ (B１の金額)</span>
                  </td>
                  <td>
                    <NumberField value={g('b_final')} onChange={(v) => u('b_final', v)} unit="円銭" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 利益金額(C) */}
            <div className="gov-cell-b px-1 py-0.5 gov-header text-[8px]">
              直前期末以前２(３)年間の利益金額
            </div>
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th>事業年度</th>
                  <th><CircledNumber n={11} />法人税の課税所得金額</th>
                  <th><CircledNumber n={12} />非経常的な利益金額</th>
                  <th><CircledNumber n={13} />受取配当等の益金不算入額</th>
                  <th><CircledNumber n={14} />左の所得税額</th>
                  <th><CircledNumber n={15} />繰越欠損金控除額</th>
                  <th><CircledNumber n={16} />差引利益金額</th>
                  <th>1株(50円)当たり<br />の年利益金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>直 前 期</td>
                  <td><NumberField value={g('income_y1')} onChange={(v) => u('income_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('extra_profit_y1')} onChange={(v) => u('extra_profit_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_exclusion_y1')} onChange={(v) => u('div_exclusion_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('tax_y1')} onChange={(v) => u('tax_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('loss_deduct_y1')} onChange={(v) => u('loss_deduct_y1', v)} unit="千円" /></td>
                  <td>
                    <span>ニ</span>
                    <NumberField value={g('net_profit_y1')} onChange={(v) => u('net_profit_y1', v)} unit="千円" className="w-14" />
                  </td>
                  <td>
                    <div>C１</div>
                    <NumberField value={g('c1')} onChange={(v) => u('c1', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td>直前々期</td>
                  <td><NumberField value={g('income_y2')} onChange={(v) => u('income_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('extra_profit_y2')} onChange={(v) => u('extra_profit_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_exclusion_y2')} onChange={(v) => u('div_exclusion_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('tax_y2')} onChange={(v) => u('tax_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('loss_deduct_y2')} onChange={(v) => u('loss_deduct_y2', v)} unit="千円" /></td>
                  <td>
                    <span>ホ</span>
                    <NumberField value={g('net_profit_y2')} onChange={(v) => u('net_profit_y2', v)} unit="千円" className="w-14" />
                  </td>
                  <td>
                    <div>C２</div>
                    <NumberField value={g('c2')} onChange={(v) => u('c2', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td colSpan={7} className="text-right">
                    Ｃ
                  </td>
                  <td>
                    <NumberField value={g('c_final')} onChange={(v) => u('c_final', v)} unit="円" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 純資産価額(D) */}
            <div className="gov-cell-b px-1 py-0.5 gov-header text-[8px]">
              直前期末（直前々期末）の純資産価額
            </div>
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th>事業年度</th>
                  <th><CircledNumber n={17} /> 資本金等の額</th>
                  <th><CircledNumber n={18} /> 利益積立金額</th>
                  <th><CircledNumber n={19} /> 純資産価額<br />（<CircledNumber n={17} />＋<CircledNumber n={18} />)</th>
                  <th>1株(50円)当たり<br />の純資産価額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>直 前 期</td>
                  <td><NumberField value={g('cap_y1')} onChange={(v) => u('cap_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('retained_y1')} onChange={(v) => u('retained_y1', v)} unit="千円" /></td>
                  <td>
                    <span>ト</span>
                    <NumberField value={g('net_asset_y1')} onChange={(v) => u('net_asset_y1', v)} unit="千円" className="w-16" />
                  </td>
                  <td>
                    <div>D１</div>
                    <NumberField value={g('d1')} onChange={(v) => u('d1', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td>直前々期</td>
                  <td><NumberField value={g('cap_y2')} onChange={(v) => u('cap_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('retained_y2')} onChange={(v) => u('retained_y2', v)} unit="千円" /></td>
                  <td>
                    <span>チ</span>
                    <NumberField value={g('net_asset_y2')} onChange={(v) => u('net_asset_y2', v)} unit="千円" className="w-16" />
                  </td>
                  <td>
                    <div>D２</div>
                    <NumberField value={g('d2')} onChange={(v) => u('d2', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="text-right">Ｄ (D１の金額)</td>
                  <td>
                    <NumberField value={g('d_final')} onChange={(v) => u('d_final', v)} unit="円" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 3. 類似業種比準価額の計算 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold">
              ３．類似業種比準価額の計算
            </div>

            {/* 類似業種株価テーブル (評価会社) */}
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th rowSpan={2} colSpan={2}>類似業種と<br />業種目番号<br />（No. )</th>
                  <th rowSpan={2}>区 分</th>
                  <th colSpan={2}>類似業種の株価</th>
                  <th colSpan={3}>1株(50円)当たりの比準価額</th>
                </tr>
                <tr>
                  <th>Ａ</th>
                  <th>円</th>
                  <th>Ｂ 円銭</th>
                  <th>Ｃ 円</th>
                  <th>Ｄ 円</th>
                </tr>
              </thead>
              <tbody>
                {/* 評価会社 */}
                <tr>
                  <td rowSpan={6} className="gov-header">
                    評価<br />会社
                  </td>
                  <td rowSpan={6}>
                    <NumberField value={g('industry_no')} onChange={(v) => u('industry_no', v)} className="w-12" />
                  </td>
                  <td>課税時期の属する月 リ</td>
                  <td><NumberField value={g('price_ri')} onChange={(v) => u('price_ri', v)} /></td>
                  <td rowSpan={6} className="text-[7px]">
                    <div>比準割合</div>
                    <div className="mt-1">B ・ C ・ D ・</div>
                  </td>
                  <td rowSpan={6}>
                    <div>評 価</div>
                    <div>Ｂ</div>
                    <NumberField value={g('eval_b')} onChange={(v) => u('eval_b', v)} className="w-14" />
                  </td>
                  <td rowSpan={6}>
                    <div>Ｃ</div>
                    <NumberField value={g('eval_c')} onChange={(v) => u('eval_c', v)} className="w-14" />
                  </td>
                  <td rowSpan={6}>
                    <div>Ｄ</div>
                    <NumberField value={g('eval_d')} onChange={(v) => u('eval_d', v)} className="w-14" />
                  </td>
                </tr>
                <tr>
                  <td>属する月の前月 ヌ</td>
                  <td><NumberField value={g('price_nu')} onChange={(v) => u('price_nu', v)} /></td>
                </tr>
                <tr>
                  <td>属する月の前々月 ル</td>
                  <td><NumberField value={g('price_ru')} onChange={(v) => u('price_ru', v)} /></td>
                </tr>
                <tr>
                  <td>前年平均株価 ヲ</td>
                  <td><NumberField value={g('price_wo')} onChange={(v) => u('price_wo', v)} /></td>
                </tr>
                <tr>
                  <td>課税時期の属する月以前２年間の平均株価 ワ</td>
                  <td><NumberField value={g('price_wa')} onChange={(v) => u('price_wa', v)} /></td>
                </tr>
                <tr>
                  <td className="font-bold">
                    <div>Ａ リ、ヌ、ル、ヲ及びワのうち最も低いもの</div>
                    <div><CircledNumber n={20} /></div>
                  </td>
                  <td><NumberField value={g('price_a')} onChange={(v) => u('price_a', v)} /></td>
                </tr>
              </tbody>
            </table>

            {/* 比準割合の計算 */}
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '40%' }}>
                    比準割合 Ｂ/Ｂ ＋ Ｃ/Ｃ ＋ Ｄ/Ｄ ÷ ３ ＝
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <span>㉑ ・ ㉒</span>
                      <NumberField value={g('ratio_result')} onChange={(v) => u('ratio_result', v)} unit="円銭" className="w-20" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 比準価額の計算 */}
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left" colSpan={2}>
                    比準価額　<CircledNumber n={4} />の金額
                  </td>
                </tr>
                <tr>
                  <td className="text-left px-2">
                    1株当たりの比準価額（㉒と㉕とのいずれか低い方の金額）× <CircledNumber n={4} />の金額 ÷ 50円
                  </td>
                  <td style={{ width: '20%' }}>
                    <div>㉖</div>
                    <NumberField value={g('hikijun_price')} onChange={(v) => u('hikijun_price', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="text-left px-2">
                    <div>直前期末の翌日から課税時期までの間に配当金交付の効力が発生した場合</div>
                    <div className="ml-2">（㉖の金額）－ 配当金額</div>
                  </td>
                  <td>
                    <div>㉗ 修正比準価額</div>
                    <NumberField value={g('modified_hikijun')} onChange={(v) => u('modified_hikijun', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="text-left px-2">
                    <div>直前期末の翌日から課税時期までの間に株式の割当て等の効力が発生した場合</div>
                  </td>
                  <td>
                    <div>㉘ 修正比準価額</div>
                    <NumberField value={g('modified_hikijun2')} onChange={(v) => u('modified_hikijun2', v)} unit="円" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 比準要素数１・０の判定 */}
            <div className="gov-header gov-cell-b px-1 py-0.5 text-[8px] font-bold">
              比準要素数１の会社・比準要素数０の会社の判定要素の金額
            </div>
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th><CircledNumber n={5} /></th>
                  <th>B１</th>
                  <th>C１</th>
                  <th>D１</th>
                  <th>B２</th>
                  <th>C２</th>
                  <th>D２</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <NumberField value={g('judge_5')} onChange={(v) => u('judge_5', v)} />
                  </td>
                  <td>
                    <NumberField value={g('judge_b1')} onChange={(v) => u('judge_b1', v)} />
                  </td>
                  <td>
                    <NumberField value={g('judge_c1')} onChange={(v) => u('judge_c1', v)} />
                  </td>
                  <td>
                    <NumberField value={g('judge_d1')} onChange={(v) => u('judge_d1', v)} />
                  </td>
                  <td>
                    <NumberField value={g('judge_b2')} onChange={(v) => u('judge_b2', v)} />
                  </td>
                  <td>
                    <NumberField value={g('judge_c2')} onChange={(v) => u('judge_c2', v)} />
                  </td>
                  <td>
                    <NumberField value={g('judge_d2')} onChange={(v) => u('judge_d2', v)} />
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
