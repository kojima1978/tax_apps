import { FormHeader } from '@/components/FormHeader';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table5';

const ASSET_ITEMS = [
  '現金・預貯金等', '受取手形', '売掛金', '有価証券',
  '商品・製品', '原材料等', '仕掛品', '前払費用',
  '貸付金', '建物', '構築物', '機械装置',
  '車両運搬具', '工具器具備品', '土地', 'その他の資産',
];

const LIABILITY_ITEMS = [
  '支払手形', '買掛金', '借入金', '未払金',
  '未払費用', '前受金', '預り金', '賞与引当金',
  '退職給付引当金', 'その他の負債',
];

export function Table5({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <FormHeader
        title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書"
        getField={(f) => g(f)}
        updateField={(f, v) => u(f, v)}
        showCompanyOnly
      />

      <div className="flex text-[9px]">
        <div className="gov-side-header gov-cell-r" style={{ width: 22, minHeight: 400 }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        <div className="flex-1">
          {/* ==================== 1. 資産及び負債の金額 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              １．資 産 及 び 負 債 の 金 額 （ 課 税 時 期 現 在 ）
            </div>

            <div className="flex">
              {/* 資産の部 */}
              <div className="flex-1 gov-cell-r">
                <div className="gov-header gov-cell-b px-1 py-0.5 text-center font-bold">
                  資 産 の 部
                </div>
                <table className="gov-table text-[8px]">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>科 目</th>
                      <th>相続税評価額</th>
                      <th>帳 簿 価 額</th>
                      <th>備 考</th>
                    </tr>
                    <tr>
                      <th>&nbsp;</th>
                      <th>千円</th>
                      <th>千円</th>
                      <th>&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ASSET_ITEMS.map((item, i) => (
                      <tr key={item}>
                        <td className="text-left gov-header">{item}</td>
                        <td>
                          <NumberField
                            value={g(`asset_eval_${i}`)}
                            onChange={(v) => u(`asset_eval_${i}`, v)}
                          />
                        </td>
                        <td>
                          <NumberField
                            value={g(`asset_book_${i}`)}
                            onChange={(v) => u(`asset_book_${i}`, v)}
                          />
                        </td>
                        <td>
                          <NumberField
                            value={g(`asset_note_${i}`)}
                            onChange={(v) => u(`asset_note_${i}`, v)}
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="gov-header">合 計</td>
                      <td>
                        <div><CircledNumber n={1} /></div>
                        <NumberField value={g('asset_eval_total')} onChange={(v) => u('asset_eval_total', v)} />
                      </td>
                      <td>
                        <div><CircledNumber n={2} /></div>
                        <NumberField value={g('asset_book_total')} onChange={(v) => u('asset_book_total', v)} />
                      </td>
                      <td>&nbsp;</td>
                    </tr>
                  </tbody>
                </table>

                {/* 株式等・土地等の内訳 */}
                <table className="gov-table text-[8px]">
                  <tbody>
                    <tr>
                      <td className="gov-header text-left">株式等の価額の合計額</td>
                      <td>イ <NumberField value={g('stock_total')} onChange={(v) => u('stock_total', v)} /></td>
                      <td>ロ <NumberField value={g('stock_book')} onChange={(v) => u('stock_book', v)} /></td>
                    </tr>
                    <tr>
                      <td className="gov-header text-left">土地等の価額の合計額</td>
                      <td>ハ <NumberField value={g('land_total')} onChange={(v) => u('land_total', v)} /></td>
                      <td>&nbsp;</td>
                    </tr>
                    <tr>
                      <td className="gov-header text-left">現物出資等受入れ資産の価額の合計額</td>
                      <td>ニ <NumberField value={g('genbutsu_eval')} onChange={(v) => u('genbutsu_eval', v)} /></td>
                      <td>ホ <NumberField value={g('genbutsu_book')} onChange={(v) => u('genbutsu_book', v)} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 負債の部 */}
              <div style={{ width: '45%' }}>
                <div className="gov-header gov-cell-b px-1 py-0.5 text-center font-bold">
                  負 債 の 部
                </div>
                <table className="gov-table text-[8px]">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>科 目</th>
                      <th>相続税評価額</th>
                      <th>帳 簿 価 額</th>
                      <th>備 考</th>
                    </tr>
                    <tr>
                      <th>&nbsp;</th>
                      <th>千円</th>
                      <th>千円</th>
                      <th>&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LIABILITY_ITEMS.map((item, i) => (
                      <tr key={item}>
                        <td className="text-left gov-header">{item}</td>
                        <td>
                          <NumberField
                            value={g(`liab_eval_${i}`)}
                            onChange={(v) => u(`liab_eval_${i}`, v)}
                          />
                        </td>
                        <td>
                          <NumberField
                            value={g(`liab_book_${i}`)}
                            onChange={(v) => u(`liab_book_${i}`, v)}
                          />
                        </td>
                        <td>
                          <NumberField
                            value={g(`liab_note_${i}`)}
                            onChange={(v) => u(`liab_note_${i}`, v)}
                          />
                        </td>
                      </tr>
                    ))}
                    {/* 空行で資産側と行数を合わせる */}
                    {Array.from({ length: ASSET_ITEMS.length - LIABILITY_ITEMS.length }, (_, i) => (
                      <tr key={`empty_${i}`}>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="gov-header">合 計</td>
                      <td>
                        <div><CircledNumber n={3} /></div>
                        <NumberField value={g('liab_eval_total')} onChange={(v) => u('liab_eval_total', v)} />
                      </td>
                      <td>
                        <div><CircledNumber n={4} /></div>
                        <NumberField value={g('liab_book_total')} onChange={(v) => u('liab_book_total', v)} />
                      </td>
                      <td>&nbsp;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ==================== 2. 評価差額に対する法人税額等相当額の計算 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              ２．評価差額に対する法人税額等相当額の計算
            </div>
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '50%' }}>
                    <CircledNumber n={5} /> 相続税評価額による純資産価額（<CircledNumber n={1} />－<CircledNumber n={3} />）
                  </td>
                  <td><NumberField value={g('net_eval')} onChange={(v) => u('net_eval', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={6} /> 帳簿価額による純資産価額（（<CircledNumber n={2} />＋(ニ－ホ)－<CircledNumber n={4} />）、マイナスの場合は０）
                  </td>
                  <td><NumberField value={g('net_book')} onChange={(v) => u('net_book', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={7} /> 評価差額に相当する金額（<CircledNumber n={5} />－<CircledNumber n={6} />、マイナスの場合は０）
                  </td>
                  <td><NumberField value={g('diff')} onChange={(v) => u('diff', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={8} /> 評価差額に対する法人税額等相当額（<CircledNumber n={7} />×37%）
                  </td>
                  <td><NumberField value={g('corp_tax')} onChange={(v) => u('corp_tax', v)} unit="千円" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== 3. 1株当たりの純資産価額の計算 ==================== */}
          <div className="gov-section">
            <div className="gov-header gov-cell-b px-1 py-0.5 font-bold text-center">
              ３．１株当たりの純資産価額の計算
            </div>
            <table className="gov-table text-[8px]">
              <tbody>
                <tr>
                  <td className="gov-header text-left" style={{ width: '50%' }}>
                    <CircledNumber n={9} /> 課税時期現在の純資産価額（相続税評価額）（<CircledNumber n={5} />－<CircledNumber n={8} />）
                  </td>
                  <td><NumberField value={g('current_net')} onChange={(v) => u('current_net', v)} unit="千円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={10} /> 課税時期現在の発行済株式数（(第１表の１の<CircledNumber n={1} />)－自己株式数）
                  </td>
                  <td><NumberField value={g('current_shares')} onChange={(v) => u('current_shares', v)} unit="株" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={11} /> 課税時期現在の1株当たりの純資産価額（相続税評価額）（<CircledNumber n={9} />÷<CircledNumber n={10} />）
                  </td>
                  <td><NumberField value={g('net_per_share')} onChange={(v) => u('net_per_share', v)} unit="円" /></td>
                </tr>
                <tr>
                  <td className="gov-header text-left">
                    <CircledNumber n={12} /> 同族株主等の議決権割合（第１表の１の<CircledNumber n={5} />の割合）が50％以下の場合（<CircledNumber n={11} />×80%）
                  </td>
                  <td><NumberField value={g('net_80pct')} onChange={(v) => u('net_80pct', v)} unit="円" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
