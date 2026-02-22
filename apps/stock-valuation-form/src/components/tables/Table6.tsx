import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table6';

export function Table6({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <FormHeader
        title="第６表　特定の評価会社の株式及び株式に関する権利の価額の計算明細書"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
        showCompanyOnly
      />

      <div className="flex text-[9px]">
        <div className="gov-side-header gov-cell-r" style={{ width: 22, minHeight: 400 }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        <div className="flex-1">
          {/* ==================== 1. 純資産価額方式等による価額 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              １．純資産価額方式等による価額
            </div>

            {/* 計算の基となる金額 */}
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th colSpan={2}>１株当たりの価額の計算の基となる金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '60%' }}>
                    <CircledNumber n={1} /> 類似業種比準価額（第４表の 26、27 又は 28 の金額）
                  </td>
                  <td><NumberField value={g('ruiji_price')} onChange={(v) => u('ruiji_price', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={2} /> 1株当たりの純資産価額（第５表の<CircledNumber n={11} />の金額）
                  </td>
                  <td><NumberField value={g('net_asset_price')} onChange={(v) => u('net_asset_price', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={3} /> 1株当たりの純資産価額の80％相当額（第５表の<CircledNumber n={12} />の記載がある場合のその金額）
                  </td>
                  <td><NumberField value={g('net_asset_80')} onChange={(v) => u('net_asset_80', v)} unit="円" /></td>
                </tr>
              </tbody>
            </table>

            {/* 株式の区分別計算 */}
            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>株 式 の 区 分</th>
                  <th>１ 株 当 た り の 価 額 の 算 定 方 法 等</th>
                  <th style={{ width: '15%' }}>1株当たりの価額</th>
                </tr>
              </thead>
              <tbody>
                {/* 比準要素数１の会社 */}
                <tr>
                  <td className="gov-header">比準要素数１<br />の会社の株式</td>
                  <td className="text-left px-2">
                    <div>次のうちいずれか低い方の金額</div>
                    <div className="ml-2">イ　<CircledNumber n={2} />の金額（<CircledNumber n={3} />の金額があるときは<CircledNumber n={3} />の金額）</div>
                    <div className="ml-2">ロ （ <CircledNumber n={1} />の金額 × 0.25 ）＋（ イの金額 × 0.75 ）</div>
                  </td>
                  <td>
                    <div><CircledNumber n={4} /></div>
                    <NumberField value={g('hikijun1_price')} onChange={(v) => u('hikijun1_price', v)} unit="円" />
                  </td>
                </tr>
                {/* 株式等保有特定会社 */}
                <tr>
                  <td className="gov-header">株式等保有特定<br />会社の株式</td>
                  <td className="text-left px-2">
                    （第８表の 27 の金額）
                  </td>
                  <td>
                    <div><CircledNumber n={5} /></div>
                    <NumberField value={g('stock_holding_price')} onChange={(v) => u('stock_holding_price', v)} unit="円" />
                  </td>
                </tr>
                {/* 土地保有特定会社 */}
                <tr>
                  <td className="gov-header">土地保有特定<br />会社の株式</td>
                  <td className="text-left px-2">
                    （<CircledNumber n={2} />の金額（<CircledNumber n={3} />の金額があるときはその金額））
                  </td>
                  <td>
                    <div><CircledNumber n={6} /></div>
                    <NumberField value={g('land_holding_price')} onChange={(v) => u('land_holding_price', v)} unit="円" />
                  </td>
                </tr>
                {/* 開業後3年未満 */}
                <tr>
                  <td className="gov-header">開業後３年未満の<br />会社等の株式</td>
                  <td className="text-left px-2">
                    （<CircledNumber n={2} />の金額（<CircledNumber n={3} />の金額があるときはその金額））
                  </td>
                  <td>
                    <div><CircledNumber n={7} /></div>
                    <NumberField value={g('startup_price')} onChange={(v) => u('startup_price', v)} unit="円" />
                  </td>
                </tr>
                {/* 開業前又は休業中 */}
                <tr>
                  <td className="gov-header">開業前又は休業中の<br />会社の株式</td>
                  <td className="text-left px-2">
                    （<CircledNumber n={2} />の金額）
                  </td>
                  <td>
                    <div><CircledNumber n={8} /></div>
                    <NumberField value={g('dormant_price')} onChange={(v) => u('dormant_price', v)} unit="円" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 修正後の株式の価額 */}
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '40%' }}>
                    修正後の株式の価額
                  </td>
                  <td className="text-left px-2">
                    <div>課税時期において配当期待権の発生している場合</div>
                    <div className="ml-2"><CircledNumber n={4} />、<CircledNumber n={5} />、<CircledNumber n={6} />、<CircledNumber n={7} />又は<CircledNumber n={8} />の金額</div>
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={9} /> 修正後の株式の価額
                  </td>
                  <td>
                    <NumberField value={g('modified_price')} onChange={(v) => u('modified_price', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={10} /> 割当株式数又は交付株式数
                  </td>
                  <td>
                    <NumberField value={g('allotment_shares')} onChange={(v) => u('allotment_shares', v)} unit="株" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 2. 配当還元方式による価額 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              ２．配当還元方式による価額
            </div>
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '35%' }}>
                    1株当たりの資本金等の額、発行済株式数等
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2 px-1">
                      <div className="flex items-center">
                        <CircledNumber n={11} /> 資本金等の額
                        <NumberField value={g('capital')} onChange={(v) => u('capital', v)} unit="千円" className="w-20" />
                      </div>
                      <div className="flex items-center">
                        <CircledNumber n={12} /> 発行済株式数
                        <NumberField value={g('issued_shares')} onChange={(v) => u('issued_shares', v)} unit="株" className="w-16" />
                      </div>
                      <div className="flex items-center">
                        <CircledNumber n={13} /> 自己株式数
                        <NumberField value={g('treasury_shares')} onChange={(v) => u('treasury_shares', v)} unit="株" className="w-16" />
                      </div>
                    </div>
                    <div className="flex items-center px-1 mt-1">
                      <CircledNumber n={14} /> 1株当たりの資本金等の額を50円とした場合の発行済株式数
                      <NumberField value={g('shares_50yen')} onChange={(v) => u('shares_50yen', v)} unit="株" className="w-16" />
                    </div>
                    <div className="flex items-center px-1 mt-1">
                      <CircledNumber n={15} /> 1株当たりの資本金等の額（<CircledNumber n={11} />÷（<CircledNumber n={12} />－<CircledNumber n={13} />））
                      <NumberField value={g('capital_per_share')} onChange={(v) => u('capital_per_share', v)} unit="円" className="w-20" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="gov-table text-[8px]">
              <thead>
                <tr>
                  <th>事業年度</th>
                  <th><CircledNumber n={16} /> 年配当金額</th>
                  <th><CircledNumber n={17} /> 左のうち非経常的な配当金額</th>
                  <th><CircledNumber n={18} /> 差引経常的な年配当金額</th>
                  <th>年平均配当金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>直 前 期</td>
                  <td><NumberField value={g('div_y1')} onChange={(v) => u('div_y1', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_extra_y1')} onChange={(v) => u('div_extra_y1', v)} unit="千円" /></td>
                  <td>イ <NumberField value={g('div_reg_y1')} onChange={(v) => u('div_reg_y1', v)} unit="千円" className="w-14" /></td>
                  <td rowSpan={2}>
                    <CircledNumber n={19} />(イ＋ロ)÷２
                    <NumberField value={g('avg_div')} onChange={(v) => u('avg_div', v)} unit="千円" />
                  </td>
                </tr>
                <tr>
                  <td>直前々期</td>
                  <td><NumberField value={g('div_y2')} onChange={(v) => u('div_y2', v)} unit="千円" /></td>
                  <td><NumberField value={g('div_extra_y2')} onChange={(v) => u('div_extra_y2', v)} unit="千円" /></td>
                  <td>ロ <NumberField value={g('div_reg_y2')} onChange={(v) => u('div_reg_y2', v)} unit="千円" className="w-14" /></td>
                </tr>
              </tbody>
            </table>

            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="text-left px-1">
                    <CircledNumber n={20} /> 1株(50円)当たり年配当金額 ÷ <CircledNumber n={14} />の株式数 ＝
                    <NumberField value={g('div_per_share')} onChange={(v) => u('div_per_share', v)} unit="円銭" className="w-16" />
                    <span className="text-[7px] ml-1">この金額が2円50銭未満の場合は2円50銭とします。</span>
                  </td>
                </tr>
                <tr>
                  <td className="text-left px-1">
                    ㉑ 配当還元価額 <CircledNumber n={20} />の金額 ÷ 10% × <CircledNumber n={15} />の金額 ÷ 50円 ＝
                    <NumberField value={g('div_return_price')} onChange={(v) => u('div_return_price', v)} unit="円" className="w-20" />
                    <span className="text-[7px] ml-1">㉑の金額が、純資産価額方式等により計算した価額を超える場合には、純資産価額方式等により計算した価額とします。</span>
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
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left">1株当たりの予想配当金額</td>
                  <td><NumberField value={g('expected_div')} onChange={(v) => u('expected_div', v)} unit="円銭" /></td>
                  <td className="gov-header">源泉徴収されるべき所得税相当額</td>
                  <td><NumberField value={g('withholding')} onChange={(v) => u('withholding', v)} unit="円銭" /></td>
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
                    <CircledNumber n={10} />(配当還元方式の場合は㉒)の金額 － 割当株式1株当たりの払込金額
                  </td>
                  <td style={{ width: '12%' }}>
                    <div>㉔</div>
                    <NumberField value={g('right_allotment')} onChange={(v) => u('right_allotment', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">株主となる権利</td>
                  <td className="text-left px-1">
                    <CircledNumber n={10} />(配当還元方式の場合は㉒)の金額
                  </td>
                  <td>
                    <div>㉕</div>
                    <NumberField value={g('right_shareholder')} onChange={(v) => u('right_shareholder', v)} unit="円" />
                  </td>
                </tr>
                <tr>
                  <td className="gov-header text-left">株式無償交付期待権</td>
                  <td className="text-left px-1">
                    <CircledNumber n={10} />(配当還元方式の場合は㉒)の金額
                  </td>
                  <td>
                    <div>㉖</div>
                    <NumberField value={g('right_free')} onChange={(v) => u('right_free', v)} unit="円" />
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
