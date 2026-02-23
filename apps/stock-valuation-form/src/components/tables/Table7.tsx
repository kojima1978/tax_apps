import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table7';
const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;
const hdr: React.CSSProperties = { background: '#f5f5f0', fontWeight: 500 };

export function Table7({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form" style={{ fontSize: 8 }}>
      {/* ===== タイトル行 ===== */}
      <div style={{ display: 'flex', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 9.5 }}>
          第７表　株式等保有特定会社の株式の価額の計算明細書
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', ...bl }}>
          <span>会社名</span>
          <FormField value={g('companyName')} onChange={(v) => u('companyName', v)} className="w-32" />
        </div>
      </div>

      {/* ===== 3カラム ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 20px', flex: 1, minHeight: 0 }}>

        {/* 左サイドバー */}
        <div className="gov-side-header" style={{ ...br, fontSize: 9, letterSpacing: '0.12em' }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        {/* ===== 中央コンテンツ ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* ======== 1. 受取配当金等収受割合の計算 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center', letterSpacing: '0.3em' }}>
            １．受取配当金等収受割合の計算
          </div>
          <table className="gov-table" style={{ fontSize: 7 }}>
            <thead>
              <tr>
                <th>事業年度</th>
                <th><CircledNumber n={1} /> 直前期</th>
                <th><CircledNumber n={2} /> 直前々期</th>
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
                  <div style={{ fontSize: 6 }}>※小数点以下３位未満切捨て</div>
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

          {/* ======== S1の比準要素の修正 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center' }}>
            Ｓ１の金額の計算に係る比準要素の修正
          </div>

          {/* B・C要素の修正 */}
          <table className="gov-table" style={{ fontSize: 7 }}>
            <tbody>
              <tr>
                <td className="gov-header text-left" style={{ width: '22%' }}>
                  <CircledNumber n={3} /> Ｂ（第４表）
                </td>
                <td style={{ width: '12%' }}>
                  <NumberField value={g('s1_b_orig')} onChange={(v) => u('s1_b_orig', v)} unit="円銭" />
                </td>
                <td className="gov-header text-left" style={{ width: '22%' }}>
                  <CircledNumber n={4} /> ｂ（<CircledNumber n={3} />×ハ）
                </td>
                <td style={{ width: '12%' }}>
                  <NumberField value={g('s1_b_adj')} onChange={(v) => u('s1_b_adj', v)} unit="円銭" />
                </td>
                <td className="gov-header text-left" style={{ width: '20%' }}>
                  <CircledNumber n={5} /> Ｂ−ｂ
                </td>
                <td style={{ width: '12%' }}>
                  <NumberField value={g('s1_b_diff')} onChange={(v) => u('s1_b_diff', v)} unit="円銭" />
                </td>
              </tr>
              <tr>
                <td className="gov-header text-left">
                  <CircledNumber n={6} /> Ｃ（第４表）
                </td>
                <td>
                  <NumberField value={g('s1_c_orig')} onChange={(v) => u('s1_c_orig', v)} unit="円" />
                </td>
                <td className="gov-header text-left">
                  <CircledNumber n={7} /> ｃ（<CircledNumber n={6} />×ハ）
                </td>
                <td>
                  <NumberField value={g('s1_c_adj')} onChange={(v) => u('s1_c_adj', v)} unit="円" />
                </td>
                <td className="gov-header text-left">
                  <CircledNumber n={8} /> Ｃ−ｃ
                </td>
                <td>
                  <NumberField value={g('s1_c_diff')} onChange={(v) => u('s1_c_diff', v)} unit="円" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* D要素の修正 */}
          <table className="gov-table" style={{ fontSize: 7 }}>
            <tbody>
              {[
                { n: '（イ）', label: '1株(50円)当たりの純資産価額（第４表のＤ）', f: 's1_d_orig', unit: '円' },
                { n: '⑨', label: '直前期末の総資産価額（帳簿価額）', f: 's1_total_assets', unit: '千円' },
                { n: '⑩', label: '直前期末の株式等の帳簿価額の合計額', f: 's1_stock_book', unit: '千円' },
                { n: '⑪', label: '1株当たりの資本金等の額を50円とした場合の発行済株式数', f: 's1_shares_50', unit: '株' },
                { n: '（ロ）', label: '（（⑨×（⑩÷⑪））×ハ）', f: 's1_d_adj_ro', unit: '円' },
                { n: '⑫', label: '利益積立金額', f: 's1_retained', unit: '千円' },
                { n: '⑬', label: 'ｄの金額（⑫＋⑮）', f: 's1_d_val', unit: '' },
                { n: '⑰', label: 'Ｄ−ｄの金額（⑨−⑯）', f: 's1_d_diff', unit: '円' },
              ].map((row) => (
                <tr key={row.f}>
                  <td className="gov-header text-left" style={{ width: '60%' }}>
                    {row.n}　{row.label}
                  </td>
                  <td>
                    <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit={row.unit || undefined} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ======== S1の類似業種比準価額の計算 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center' }}>
            Ｓ１の修正後の類似業種比準価額の計算
          </div>
          <table className="gov-table" style={{ fontSize: 7 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '10%' }}>業種目番号</th>
                <th rowSpan={2} style={{ width: '20%' }}>区分</th>
                <th colSpan={2}>類似業種の株価</th>
                <th colSpan={3}>1株(50円)当たりの比準要素</th>
              </tr>
              <tr>
                <th>Ａ　円</th>
                <th>&nbsp;</th>
                <th>(<CircledNumber n={5} />) 円銭</th>
                <th>(<CircledNumber n={8} />) 円</th>
                <th>(<CircledNumber n={17} />) 円</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '課税時期の属する月 ニ', f: 's1_price_ni' },
                { label: '属する月の前月 ホ', f: 's1_price_ho' },
                { label: '属する月の前々月 ヘ', f: 's1_price_he' },
                { label: '前年平均株価 ト', f: 's1_price_to' },
                { label: '課税時期の属する月以前２年間の平均株価 チ', f: 's1_price_chi' },
              ].map((row, i) => (
                <tr key={row.f}>
                  {i === 0 && (
                    <td rowSpan={5}>
                      <NumberField value={g('s1_industry_no')} onChange={(v) => u('s1_industry_no', v)} className="w-12" />
                    </td>
                  )}
                  <td className="text-left px-1" style={{ fontSize: 6.5 }}>{row.label}</td>
                  <td><NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} /></td>
                  {i === 0 && (
                    <>
                      <td rowSpan={5} style={{ fontSize: 6.5, textAlign: 'center' }}>比準割合<br />Ｂ・Ｃ・Ｄ</td>
                      <td rowSpan={5}><NumberField value={g('s1_eval_b')} onChange={(v) => u('s1_eval_b', v)} /></td>
                      <td rowSpan={5}><NumberField value={g('s1_eval_c')} onChange={(v) => u('s1_eval_c', v)} /></td>
                      <td rowSpan={5}><NumberField value={g('s1_eval_d')} onChange={(v) => u('s1_eval_d', v)} /></td>
                    </>
                  )}
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="font-bold">
                  Ａ 最も低いもの <CircledNumber n={18} />
                </td>
                <td><NumberField value={g('s1_price_a')} onChange={(v) => u('s1_price_a', v)} /></td>
                <td colSpan={4}>
                  <div className="flex items-center gap-1 px-1">
                    比準割合 <CircledNumber n={19} /> <CircledNumber n={20} />
                    <NumberField value={g('s1_ratio')} onChange={(v) => u('s1_ratio', v)} className="w-16" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 比準価額の計算 */}
          <table className="gov-table" style={{ fontSize: 7 }}>
            <tbody>
              {[
                { label: '1株当たりの比準価額（⑳と㉓とのいずれか低い方）× 第４表④ ÷ 50円', n: '㉔', f: 's1_hikijun' },
                { label: '直前期末の翌日から課税時期までの間に配当金交付の効力が発生した場合（㉔−配当金額）', n: '㉕ 修正比準価額', f: 's1_modified' },
                { label: '直前期末の翌日から課税時期までの間に株式の割当て等の効力が発生した場合', n: '㉖', f: 's1_modified2' },
              ].map((row) => (
                <tr key={row.f}>
                  <td className="text-left px-1" style={{ fontSize: 6.5 }}>{row.label}</td>
                  <td style={{ width: '15%' }}>
                    <div style={{ fontSize: 6.5 }}>{row.n}</div>
                    <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit="円" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 右サイドバー */}
        <div className="gov-side-header" style={{ ...bl, fontSize: 9, letterSpacing: '0.12em' }}>
          （令和六年一月一日以降用）
        </div>
      </div>
    </div>
  );
}
