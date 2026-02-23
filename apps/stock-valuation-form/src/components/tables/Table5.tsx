import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table5';
const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;
const hdr: React.CSSProperties = { background: '#f5f5f0', fontWeight: 500 };
const vt: React.CSSProperties = { writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.12em' };

const ROWS = 16; // 資産・負債の行数

export function Table5({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form" style={{ fontSize: 8 }}>
      {/* ===== タイトル行 ===== */}
      <div style={{ display: 'flex', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 9.5 }}>
          第５表　１株当たりの純資産価額（相続税評価額）の計算明細書
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

          {/* ======== 1. 資産及び負債の金額 ======== */}
          <div style={{ ...bb, padding: '2px 4px', fontWeight: 700, fontSize: 8, textAlign: 'center', letterSpacing: '0.3em' }}>
            １．資産及び負債の金額（課税時期現在）
          </div>

          {/* 資産の部 ＋ 負債の部 */}
          <div style={{ display: 'flex', flex: 1, ...bb }}>
            {/* ---- 資産の部 ---- */}
            <div style={{ flex: 1, ...br, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', letterSpacing: '0.5em', fontWeight: 700 }}>
                資　産　の　部
              </div>
              {/* ヘッダー */}
              <div style={{ display: 'flex', ...bb, fontSize: 7, textAlign: 'center' }}>
                <div style={{ width: '28%', ...br, ...hdr, padding: '1px' }}>科　目</div>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px' }}>相続税評価額</div>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px' }}>帳 簿 価 額</div>
                <div style={{ width: '14%', ...hdr, padding: '1px' }}>備　考</div>
              </div>
              <div style={{ display: 'flex', ...bb, fontSize: 6.5, textAlign: 'center' }}>
                <div style={{ width: '28%', ...br, padding: '0px' }}>&nbsp;</div>
                <div style={{ flex: 1, ...br, padding: '0px' }}>千円</div>
                <div style={{ flex: 1, ...br, padding: '0px' }}>千円</div>
                <div style={{ width: '14%', padding: '0px' }}>&nbsp;</div>
              </div>
              {/* データ行 */}
              {Array.from({ length: ROWS }, (_, i) => (
                <div key={i} style={{ display: 'flex', ...bb, minHeight: 13 }}>
                  <div style={{ width: '28%', ...br, padding: '0px 2px' }}>
                    <FormField value={g(`a_name_${i}`)} onChange={(v) => u(`a_name_${i}`, v)} />
                  </div>
                  <div style={{ flex: 1, ...br, padding: '0px 2px' }}>
                    <NumberField value={g(`a_eval_${i}`)} onChange={(v) => u(`a_eval_${i}`, v)} />
                  </div>
                  <div style={{ flex: 1, ...br, padding: '0px 2px' }}>
                    <NumberField value={g(`a_book_${i}`)} onChange={(v) => u(`a_book_${i}`, v)} />
                  </div>
                  <div style={{ width: '14%', padding: '0px 2px' }}>
                    <FormField value={g(`a_note_${i}`)} onChange={(v) => u(`a_note_${i}`, v)} />
                  </div>
                </div>
              ))}
              {/* 合計 */}
              <div style={{ display: 'flex', ...bb, fontWeight: 700 }}>
                <div style={{ width: '28%', ...br, ...hdr, textAlign: 'center', padding: '2px', letterSpacing: '0.5em' }}>合　計</div>
                <div style={{ flex: 1, ...br, padding: '1px 2px', textAlign: 'center' }}>
                  <span>①</span>
                  <NumberField value={g('a_eval_total')} onChange={(v) => u('a_eval_total', v)} />
                </div>
                <div style={{ flex: 1, ...br, padding: '1px 2px', textAlign: 'center' }}>
                  <span>②</span>
                  <NumberField value={g('a_book_total')} onChange={(v) => u('a_book_total', v)} />
                </div>
                <div style={{ width: '14%' }} />
              </div>
              {/* 株式等・土地等・現物出資等 */}
              {[
                { label: '株式等の価額の合計額', e: 'イ', b: 'ロ', fe: 'stock_eval', fb: 'stock_book' },
                { label: '土地等の価額の合計額', e: 'ハ', b: '', fe: 'land_eval', fb: '' },
                { label: '現物出資等受入れ資産の価額の合計額', e: 'ニ', b: 'ホ', fe: 'genbutsu_eval', fb: 'genbutsu_book' },
              ].map((row) => (
                <div key={row.fe} style={{ display: 'flex', ...bb, fontSize: 7 }}>
                  <div style={{ width: '28%', ...br, ...hdr, padding: '1px 2px' }}>{row.label}</div>
                  <div style={{ flex: 1, ...br, padding: '1px 2px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 2 }}>{row.e}</span>
                    <NumberField value={g(row.fe)} onChange={(v) => u(row.fe, v)} />
                  </div>
                  <div style={{ flex: 1, ...br, padding: '1px 2px', display: 'flex', alignItems: 'center' }}>
                    {row.fb && (
                      <>
                        <span style={{ marginRight: 2 }}>{row.b}</span>
                        <NumberField value={g(row.fb)} onChange={(v) => u(row.fb, v)} />
                      </>
                    )}
                  </div>
                  <div style={{ width: '14%' }} />
                </div>
              ))}
            </div>

            {/* ---- 負債の部 ---- */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', letterSpacing: '0.5em', fontWeight: 700 }}>
                負　債　の　部
              </div>
              {/* ヘッダー */}
              <div style={{ display: 'flex', ...bb, fontSize: 7, textAlign: 'center' }}>
                <div style={{ width: '28%', ...br, ...hdr, padding: '1px' }}>科　目</div>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px' }}>相続税評価額</div>
                <div style={{ flex: 1, ...br, ...hdr, padding: '1px' }}>帳 簿 価 額</div>
                <div style={{ width: '14%', ...hdr, padding: '1px' }}>備　考</div>
              </div>
              <div style={{ display: 'flex', ...bb, fontSize: 6.5, textAlign: 'center' }}>
                <div style={{ width: '28%', ...br, padding: '0px' }}>&nbsp;</div>
                <div style={{ flex: 1, ...br, padding: '0px' }}>千円</div>
                <div style={{ flex: 1, ...br, padding: '0px' }}>千円</div>
                <div style={{ width: '14%', padding: '0px' }}>&nbsp;</div>
              </div>
              {/* データ行 */}
              {Array.from({ length: ROWS }, (_, i) => (
                <div key={i} style={{ display: 'flex', ...bb, minHeight: 13 }}>
                  <div style={{ width: '28%', ...br, padding: '0px 2px' }}>
                    <FormField value={g(`l_name_${i}`)} onChange={(v) => u(`l_name_${i}`, v)} />
                  </div>
                  <div style={{ flex: 1, ...br, padding: '0px 2px' }}>
                    <NumberField value={g(`l_eval_${i}`)} onChange={(v) => u(`l_eval_${i}`, v)} />
                  </div>
                  <div style={{ flex: 1, ...br, padding: '0px 2px' }}>
                    <NumberField value={g(`l_book_${i}`)} onChange={(v) => u(`l_book_${i}`, v)} />
                  </div>
                  <div style={{ width: '14%', padding: '0px 2px' }}>
                    <FormField value={g(`l_note_${i}`)} onChange={(v) => u(`l_note_${i}`, v)} />
                  </div>
                </div>
              ))}
              {/* 合計 */}
              <div style={{ display: 'flex', ...bb, fontWeight: 700 }}>
                <div style={{ width: '28%', ...br, ...hdr, textAlign: 'center', padding: '2px', letterSpacing: '0.5em' }}>合　計</div>
                <div style={{ flex: 1, ...br, padding: '1px 2px', textAlign: 'center' }}>
                  <span>③</span>
                  <NumberField value={g('l_eval_total')} onChange={(v) => u('l_eval_total', v)} />
                </div>
                <div style={{ flex: 1, ...br, padding: '1px 2px', textAlign: 'center' }}>
                  <span>④</span>
                  <NumberField value={g('l_book_total')} onChange={(v) => u('l_book_total', v)} />
                </div>
                <div style={{ width: '14%' }} />
              </div>
              {/* 空き行（資産側の特別行と高さを合わせる） */}
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', ...bb, minHeight: 13 }}>
                  <div style={{ width: '28%', ...br }} />
                  <div style={{ flex: 1, ...br }} />
                  <div style={{ flex: 1, ...br }} />
                  <div style={{ width: '14%' }} />
                </div>
              ))}
            </div>
          </div>

          {/* ======== 下段: セクション2 (左) + セクション3 (右) ======== */}
          <div style={{ display: 'flex' }}>
            {/* ---- 2. 評価差額に対する法人税額等相当額の計算 ---- */}
            <div style={{ flex: 1, ...br }}>
              <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 7.5 }}>
                ２．評価差額に対する法人税額等相当額の計算
              </div>
              <table className="gov-table" style={{ fontSize: 7 }}>
                <tbody>
                  {[
                    { n: '⑤', label: '相続税評価額による純資産価額（①−③）', f: 'net_eval', unit: '千円' },
                    { n: '⑥', label: '帳簿価額による純資産価額（（②＋ニ−ホ−④）、マイナスの場合は０）', f: 'net_book', unit: '千円' },
                    { n: '⑦', label: '評価差額に相当する金額（⑤−⑥、マイナスの場合は０）', f: 'diff', unit: '千円' },
                    { n: '⑧', label: '評価差額に対する法人税額等相当額（⑦×37%）', f: 'corp_tax', unit: '千円' },
                  ].map((row) => (
                    <tr key={row.f}>
                      <td className="gov-header text-left" style={{ fontSize: 6.5 }}>
                        {row.n}　{row.label}
                      </td>
                      <td style={{ width: '30%' }}>
                        <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit={row.unit} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---- 3. 1株当たりの純資産価額の計算 ---- */}
            <div style={{ flex: 1 }}>
              <div style={{ ...bb, ...hdr, padding: '2px 4px', fontWeight: 700, fontSize: 7.5 }}>
                ３．１株当たりの純資産価額の計算
              </div>
              <table className="gov-table" style={{ fontSize: 7 }}>
                <tbody>
                  {[
                    { n: '⑨', label: '課税時期現在の純資産価額（相続税評価額）（⑤−⑧）', f: 'current_net', unit: '千円' },
                    { n: '⑩', label: '課税時期現在の発行済株式数（（第１表の１の①）−自己株式数）', f: 'current_shares', unit: '株' },
                    { n: '⑪', label: '課税時期現在の1株当たりの純資産価額（相続税評価額）（⑨÷⑩）', f: 'net_per_share', unit: '円' },
                    { n: '⑫', label: '同族株主等の議決権割合（第１表の１の⑤の割合）が50％以下の場合（⑪×80%）', f: 'net_80pct', unit: '円' },
                  ].map((row) => (
                    <tr key={row.f}>
                      <td className="gov-header text-left" style={{ fontSize: 6.5 }}>
                        {row.n}　{row.label}
                      </td>
                      <td style={{ width: '30%' }}>
                        <NumberField value={g(row.f)} onChange={(v) => u(row.f, v)} unit={row.unit} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右サイドバー */}
        <div className="gov-side-header" style={{ ...bl, fontSize: 9, letterSpacing: '0.12em' }}>
          （令和六年一月一日以降用）
        </div>
      </div>
    </div>
  );
}
