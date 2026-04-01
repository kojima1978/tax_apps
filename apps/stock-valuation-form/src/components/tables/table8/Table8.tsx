import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import { TableTitleBar } from '../TableTitleBar';
import { bb, br, hdr } from '../shared';
import type { TableProps } from '@/types/form';

const T = 'table8' as const;

export function Table8({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form" style={{ fontSize: 8 }}>
      <TableTitleBar
        title="第８表　株式等保有特定会社の株式の価額の計算明細書（続）"
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      {/* ===== 3カラム ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* ======== S1の純資産価額の修正計算 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center' }}>
            Ｓ１の純資産価額（相続税評価額）の修正計算
          </div>
          <table className="gov-table" style={{ fontSize: 7 }}>
            <tbody>
              {([
                [
                  { n: 1, label: '相続税評価額による純資産価額（第５表⑤）', f: 's1_net_eval', unit: '千円' },
                  { n: 2, label: '株式等の価額の合計額（第５表イ）', f: 's1_stock_eval', unit: '千円' },
                ],
                [
                  { n: 3, label: <>差引（<CircledNumber n={1} />−<CircledNumber n={2} />）</>, f: 's1_diff_1', unit: '千円' },
                  { n: 4, label: '帳簿価額による純資産価額（第５表⑥）', f: 's1_net_book', unit: '千円' },
                ],
                [
                  { n: 5, label: '株式等の帳簿価額の合計額', f: 's1_stock_book2', unit: '千円' },
                  { n: 6, label: <>差引（<CircledNumber n={4} />−<CircledNumber n={5} />）</>, f: 's1_diff_2', unit: '千円' },
                ],
                [
                  { n: 7, label: <>評価差額（<CircledNumber n={3} />−<CircledNumber n={6} />）</>, f: 's1_eval_diff', unit: '千円' },
                  { n: 8, label: <>法人税額等相当額（<CircledNumber n={7} />×37％）</>, f: 's1_corp_tax', unit: '千円' },
                ],
                [
                  { n: 9, label: <>修正純資産価額（<CircledNumber n={3} />−<CircledNumber n={8} />）</>, f: 's1_modified_net', unit: '千円' },
                  { n: 10, label: '発行済株式数（第５表⑩）', f: 's1_shares', unit: '株' },
                ],
              ] as const).map(([left, right]) => (
                <tr key={left.f}>
                  <td className="gov-header text-left" style={{ width: '33%' }}>
                    <CircledNumber n={left.n} /> {left.label}
                  </td>
                  <td style={{ width: '17%' }}>
                    <NumberField value={g(left.f)} onChange={(v) => u(left.f, v)} unit={left.unit} />
                  </td>
                  <td className="gov-header text-left" style={{ width: '33%' }}>
                    <CircledNumber n={right.n} /> {right.label}
                  </td>
                  <td style={{ width: '17%' }}>
                    <NumberField value={g(right.f)} onChange={(v) => u(right.f, v)} unit={right.unit} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="gov-header text-left" colSpan={3}>
                  <CircledNumber n={11} /> 修正後の1株当たりの純資産価額（相続税評価額）（<CircledNumber n={9} />÷<CircledNumber n={10} />）
                </td>
                <td>
                  <NumberField value={g('s1_net_per_share')} onChange={(v) => u('s1_net_per_share', v)} unit="円" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* ======== S1の金額の計算 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center' }}>
            Ｓ１の金額の計算
          </div>
          <div style={{ display: 'flex', ...bb }}>
            {/* 左: 基となる金額 */}
            <div style={{ flex: 1, ...br }}>
              <table className="gov-table" style={{ fontSize: 7 }}>
                <thead>
                  <tr>
                    <th>修正後の類似業種比準価額<br />（第７表の㉔〜㉖）</th>
                    <th>修正後の1株当たりの<br />純資産価額（<CircledNumber n={11} />）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <CircledNumber n={12} />
                      <NumberField value={g('s1_ruiji')} onChange={(v) => u('s1_ruiji', v)} unit="円" />
                    </td>
                    <td>
                      <CircledNumber n={13} />
                      <NumberField value={g('s1_net_val')} onChange={(v) => u('s1_net_val', v)} unit="円" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* 右: S1の金額の算定方法 */}
            <div style={{ flex: 1 }}>
              <table className="gov-table" style={{ fontSize: 7 }}>
                <tbody>
                  {[
                    { label: '比準要素数１である会社のＳ1の金額', n: 14, f: 's1_result_14' },
                    { label: '大会社のＳ1の金額', n: 15, f: 's1_result_15' },
                    { label: '中会社のＳ1の金額', n: 16, f: 's1_result_16' },
                    { label: '小会社のＳ1の金額', n: 17, f: 's1_result_17' },
                  ].map((row) => (
                    <tr key={row.f}>
                      <td className="gov-header text-left" style={{ fontSize: 6.5 }}>{row.label}</td>
                      <td style={{ width: '30%' }}>
                        <CircledNumber n={row.n} />
                        <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit="円" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======== 2. S2の金額の計算 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center' }}>
            ２．Ｓ２の金額の計算
          </div>
          <table className="gov-table" style={{ fontSize: 7 }}>
            <tbody>
              {[
                { n: '⑱', label: '課税時期現在の株式等の価額の合計額（第５表イ）', f: 's2_stock_eval', unit: '千円' },
                { n: '⑲', label: '株式等の帳簿価額の合計額（第５表ロ＋(ニ−ホ)）', f: 's2_stock_book', unit: '千円' },
                { n: '⑳', label: '株式等に係る評価差額（⑱−⑲）', f: 's2_diff', unit: '千円' },
                { n: '㉑', label: '法人税額等相当額（⑳×37％）', f: 's2_corp_tax', unit: '千円' },
                { n: '㉒', label: 'Ｓ２の純資産価額相当額（⑱−㉑）', f: 's2_net', unit: '千円' },
                { n: '㉓', label: '発行済株式数（第５表⑩）', f: 's2_shares', unit: '株' },
                { n: '㉔', label: 'Ｓ２の金額（㉒÷㉓）', f: 's2_result', unit: '円' },
              ].map((row) => (
                <tr key={row.f}>
                  <td className="gov-header text-left" style={{ width: '60%' }}>
                    {row.n}　{row.label}
                  </td>
                  <td>
                    <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit={row.unit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ======== 3. 株式等保有特定会社の株式の価額 ======== */}
          <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center' }}>
            ３．株式等保有特定会社の株式の価額
          </div>
          <table className="gov-table" style={{ fontSize: 7 }}>
            <tbody>
              {[
                { n: '㉕', label: 'Ｓ1＋Ｓ2の合計額（（⑭〜⑰のいずれか）＋㉔）', f: 'total_s1_s2', unit: '円' },
                { n: '㉖', label: '1株当たりの純資産価額（第５表⑪（⑫がある場合はその金額））', f: 'net_asset_ref', unit: '円' },
                { n: '㉗', label: '株式等保有特定会社の株式の価額（㉕と㉖のいずれか低い方）', f: 'final_price', unit: '円' },
              ].map((row) => (
                <tr key={row.f} className={row.n === '㉗' ? 'font-bold' : ''}>
                  <td className="gov-header text-left" style={{ width: '60%' }}>
                    {row.n}　{row.label}
                  </td>
                  <td>
                    <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit={row.unit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
}
