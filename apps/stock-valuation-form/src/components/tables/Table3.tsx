import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table3';

export function Table3({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <FormHeader
        title="第３表　一般の評価会社の株式及び株式に関する権利の価額の計算明細書"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
        showCompanyOnly
      />

      <div className="flex text-[9px]">
        {/* 左側：縦書きヘッダー */}
        <div className="gov-side-header gov-cell-r" style={{ width: 22, minHeight: 400 }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        <div className="flex-1">
          {/* ==================== 1. 原則的評価方式による価額 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              １．原則的評価方式による価額
            </div>

            {/* 計算の基となる金額 */}
            <table className="gov-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>１株当たりの価額の計算の基となる金額</th>
                  <th colSpan={3}>
                    <div className="text-left px-1">
                      <CircledNumber n={1} /> 類似業種比準価額（第４表の 26、27 又は 28 の金額）
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="gov-header text-left" rowSpan={3}>
                    <div><CircledNumber n={1} /> 類似業種比準価額</div>
                    <div className="mt-1"><CircledNumber n={2} /> 1株当たりの純資産価額</div>
                    <div className="text-[8px]">（第５表の<CircledNumber n={11} />の金額）</div>
                    <div className="mt-1"><CircledNumber n={3} /> 1株当たりの純資産価額の80％相当額</div>
                    <div className="text-[8px]">（第５表の<CircledNumber n={12} />の記載がある場合のその金額）</div>
                  </td>
                  <td className="text-left"><CircledNumber n={1} /></td>
                  <td><NumberField value={g('ruiji_price')} onChange={(v) => u('ruiji_price', v)} unit="円" /></td>
                  <td rowSpan={3} style={{ width: '15%' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td className="text-left"><CircledNumber n={2} /></td>
                  <td><NumberField value={g('net_asset_price')} onChange={(v) => u('net_asset_price', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="text-left"><CircledNumber n={3} /></td>
                  <td><NumberField value={g('net_asset_80')} onChange={(v) => u('net_asset_80', v)} unit="円" /></td>
                </tr>
              </tbody>
            </table>

            {/* 区分別の計算 */}
            <table className="gov-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>区 分</th>
                  <th>１ 株 当 た り の 価 額 の 算 定 方 法</th>
                  <th style={{ width: '15%' }}>１株当たりの価額</th>
                </tr>
              </thead>
              <tbody>
                {/* 大会社 */}
                <tr>
                  <td className="gov-header font-bold">大 会 社 の<br />株式の価額</td>
                  <td className="text-left px-2">
                    <div>次のうちいずれか低い方の金額（<CircledNumber n={2} />の記載がないときは<CircledNumber n={1} />の金額）</div>
                    <div className="ml-2">イ　<CircledNumber n={1} />の金額</div>
                    <div className="ml-2">ロ　<CircledNumber n={2} />の金額</div>
                  </td>
                  <td>
                    <div><CircledNumber n={4} /></div>
                    <NumberField value={g('large_price')} onChange={(v) => u('large_price', v)} unit="円" />
                  </td>
                </tr>
                {/* 中会社 */}
                <tr>
                  <td className="gov-header font-bold">中 会 社 の<br />株式の価額</td>
                  <td className="text-left px-2">
                    <div>
                      （<CircledNumber n={1} />と<CircledNumber n={2} />とのいずれか低い方の金額 × Ｌの割合 ）
                      ＋（ <CircledNumber n={2} />の金額（<CircledNumber n={3} />の金額があるときは<CircledNumber n={3} />の金額）×（１－ Ｌの割合 ））
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span>Ｌの割合</span>
                      <NumberField value={g('l_ratio')} onChange={(v) => u('l_ratio', v)} className="w-12" />
                    </div>
                  </td>
                  <td>
                    <div><CircledNumber n={5} /></div>
                    <NumberField value={g('medium_price')} onChange={(v) => u('medium_price', v)} unit="円" />
                  </td>
                </tr>
                {/* 小会社 */}
                <tr>
                  <td className="gov-header font-bold">小 会 社 の<br />株式の価額</td>
                  <td className="text-left px-2">
                    <div>次のうちいずれか低い方の金額</div>
                    <div className="ml-2">イ　<CircledNumber n={2} />の金額（<CircledNumber n={3} />の金額があるときは<CircledNumber n={3} />の金額）</div>
                    <div className="ml-2">ロ （ <CircledNumber n={1} />の金額 × 0.50 ）＋（ イの金額 × 0.50 ）</div>
                  </td>
                  <td>
                    <div><CircledNumber n={6} /></div>
                    <NumberField value={g('small_price')} onChange={(v) => u('small_price', v)} unit="円" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 修正後の株式の価額 */}
            <table className="gov-table">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '50%' }}>
                    修 正 後 の 株 式 の 価 額
                  </td>
                  <td colSpan={2}>
                    <div className="text-left px-2 text-[8px]">
                      <div>課税時期において配当期待権の発生している場合</div>
                      <div className="ml-2">
                        <CircledNumber n={4} />、<CircledNumber n={5} />又は<CircledNumber n={6} />の金額 － 1株当たりの配当金額
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={7} /> 修正後の株式の価額
                  </td>
                  <td><NumberField value={g('modified_price')} onChange={(v) => u('modified_price', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={8} /> 割当株式数又は交付株式数
                  </td>
                  <td><NumberField value={g('allotment_shares')} onChange={(v) => u('allotment_shares', v)} unit="株" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 2. 配当還元方式による価額 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              ２．配当還元方式による価額
            </div>

            <table className="gov-table">
              <tbody>
                {/* 1株当たりの資本金等の額 */}
                <tr>
                  <td className="gov-header text-left" style={{ width: '30%' }}>
                    1株当たりの資本金等の額、発行済株式数等
                  </td>
                  <td colSpan={3}>
                    <div className="flex flex-wrap gap-2 px-1">
                      <div className="flex items-center">
                        <CircledNumber n={9} />
                        <span className="mx-1">直前期末の資本金等の額</span>
                        <NumberField value={g('capital_amount')} onChange={(v) => u('capital_amount', v)} unit="千円" className="w-24" />
                      </div>
                      <div className="flex items-center">
                        <CircledNumber n={10} />
                        <span className="mx-1">発行済株式数</span>
                        <NumberField value={g('issued_shares')} onChange={(v) => u('issued_shares', v)} unit="株" className="w-20" />
                      </div>
                      <div className="flex items-center">
                        <CircledNumber n={11} />
                        <span className="mx-1">自己株式数</span>
                        <NumberField value={g('treasury_shares')} onChange={(v) => u('treasury_shares', v)} unit="株" className="w-20" />
                      </div>
                    </div>
                    <div className="flex items-center px-1 mt-1">
                      <CircledNumber n={12} />
                      <span className="mx-1">1株当たりの資本金等の額（<CircledNumber n={9} />÷（<CircledNumber n={10} />－<CircledNumber n={11} />））</span>
                      <NumberField value={g('capital_per_share')} onChange={(v) => u('capital_per_share', v)} unit="円" className="w-24" />
                    </div>
                    <div className="flex items-center px-1 mt-1">
                      <CircledNumber n={13} />
                      <span className="mx-1">1株当たりの資本金等の額を50円とした場合の発行済株式数（<CircledNumber n={9} />÷50円）</span>
                      <NumberField value={g('shares_50yen')} onChange={(v) => u('shares_50yen', v)} unit="株" className="w-20" />
                    </div>
                  </td>
                </tr>

                {/* 年配当金額 */}
                <tr>
                  <td className="gov-header text-left" rowSpan={4}>
                    配当還元方式による価額の計算
                  </td>
                  <td colSpan={3}>
                    <div className="text-left px-1">
                      <table className="gov-table text-[8px]">
                        <thead>
                          <tr>
                            <th>事業年度</th>
                            <th><CircledNumber n={14} /> 年配当金額</th>
                            <th><CircledNumber n={15} /> 左のうち非経常的な配当金額</th>
                            <th><CircledNumber n={16} /> 差引経常的な年配当金額<br />（<CircledNumber n={14} />－<CircledNumber n={15} />）</th>
                            <th>年平均配当金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>直 前 期</td>
                            <td><NumberField value={g('div_prev1')} onChange={(v) => u('div_prev1', v)} unit="千円" /></td>
                            <td><NumberField value={g('div_extra1')} onChange={(v) => u('div_extra1', v)} unit="千円" /></td>
                            <td>
                              <span>イ</span>
                              <NumberField value={g('div_regular1')} onChange={(v) => u('div_regular1', v)} unit="千円" className="w-16" />
                            </td>
                            <td rowSpan={2}>
                              <div><CircledNumber n={17} />（イ＋ロ）÷２</div>
                              <NumberField value={g('avg_dividend')} onChange={(v) => u('avg_dividend', v)} unit="千円" />
                            </td>
                          </tr>
                          <tr>
                            <td>直前々期</td>
                            <td><NumberField value={g('div_prev2')} onChange={(v) => u('div_prev2', v)} unit="千円" /></td>
                            <td><NumberField value={g('div_extra2')} onChange={(v) => u('div_extra2', v)} unit="千円" /></td>
                            <td>
                              <span>ロ</span>
                              <NumberField value={g('div_regular2')} onChange={(v) => u('div_regular2', v)} unit="千円" className="w-16" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-left px-1">
                    <div className="flex items-center gap-1">
                      <CircledNumber n={18} />
                      <span>1株(50円)当たり年配当金額</span>
                      <span>÷ <CircledNumber n={13} />の株式数 ＝</span>
                      <NumberField value={g('div_per_share')} onChange={(v) => u('div_per_share', v)} unit="円銭" className="w-20" />
                      <span className="text-[8px]">この金額が2円50銭未満の場合は2円50銭とします。</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-left px-1">
                    <div className="flex items-center gap-1">
                      <CircledNumber n={19} />
                      <span>配当還元価額</span>
                      <span><CircledNumber n={18} />の金額 ÷ 10% × <CircledNumber n={13} />の金額 ÷ 50円 ＝</span>
                      <NumberField value={g('div_return_price')} onChange={(v) => u('div_return_price', v)} unit="円" className="w-24" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-left px-1 text-[8px]">
                    <CircledNumber n={19} />の金額が、原則的評価方式により計算した価額を超える場合には、原則的評価方式により計算した価額とします。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 3. 配当期待権 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              ３．配当期待権
            </div>
            <table className="gov-table">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '40%' }}>
                    1株当たりの予想配当金額
                  </td>
                  <td>
                    <NumberField value={g('expected_dividend')} onChange={(v) => u('expected_dividend', v)} unit="円銭" />
                  </td>
                  <td className="gov-header">源泉徴収されるべき所得税相当額</td>
                  <td>
                    <NumberField value={g('withholding_tax')} onChange={(v) => u('withholding_tax', v)} unit="円銭" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 4. 株式及び株式に関する権利の価額 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              ４．株式及び株式に関する権利の価額（１．及び２．に共通）
            </div>
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left">株式の割当てを受ける権利</td>
                  <td className="text-left px-1">
                    <span><CircledNumber n={8} />（配当還元方式の場合は<CircledNumber n={20} />）の金額 － 割当株式1株当たりの払込金額</span>
                  </td>
                  <td style={{ width: '15%' }}>
                    <div>㉑</div>
                    <NumberField value={g('right_allotment')} onChange={(v) => u('right_allotment', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">株主となる権利</td>
                  <td className="text-left px-1">
                    <span><CircledNumber n={8} />（配当還元方式の場合は<CircledNumber n={20} />）の金額</span>
                  </td>
                  <td>
                    <div>㉒</div>
                    <NumberField value={g('right_shareholder')} onChange={(v) => u('right_shareholder', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">株式無償交付期待権</td>
                  <td className="text-left px-1">
                    <span><CircledNumber n={8} />（配当還元方式の場合は<CircledNumber n={20} />）の金額</span>
                  </td>
                  <td>
                    <div>㉓</div>
                    <NumberField value={g('right_free_allot')} onChange={(v) => u('right_free_allot', v)} unit="円" />
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
