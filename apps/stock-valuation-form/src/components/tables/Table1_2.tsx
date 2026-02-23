import { NumberField } from '@/components/ui/NumberField';
import { FormField } from '@/components/ui/FormField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table1_2';

const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;

export function Table1_2({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      {/* ===== タイトル行 ===== */}
      <div style={{ display: 'flex', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 11 }}>
          第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', ...bl }}>
          <span>会社名</span>
          <FormField value={g('companyName')} onChange={(v) => u('companyName', v)} className="w-32" />
        </div>
      </div>

      {/* ===== メインボディ (左サイドバー | 中央 | 右サイドバー) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 20px', flex: 1, minHeight: 0 }}>

        {/* 左サイドバー */}
        <div className="gov-side-header" style={{ ...br, fontSize: 9, letterSpacing: '0.12em' }}>
          取引相場のない株式（出資）の評価明細書
        </div>

        {/* ===== 中央コンテンツ ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* ---- ３．会社の規模（Ｌの割合）の判定 ---- */}
          <div style={{ padding: '2px 4px', fontWeight: 700, ...bb }}>
            ３．会社の規模（Ｌの割合）の判定
          </div>

          {/* ---- 判定要素テーブル ---- */}
          <div style={{ ...bb }}>
            <table className="gov-table" style={{ fontSize: 8.5 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 20 }}></th>
                  <th colSpan={2}>項　　目</th>
                  <th>金　　　額</th>
                  <th colSpan={2}>項　　目</th>
                  <th>人　　　数</th>
                </tr>
              </thead>
              <tbody>
                {/* 判定要素 Row 1: 総資産価額 */}
                <tr>
                  <td rowSpan={4} className="gov-header" style={{ fontSize: 8, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.3em', width: 20 }}>
                    判定要素
                  </td>
                  <td colSpan={2} rowSpan={2} className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top' }}>
                    <div>直前期末の総資産価額</div>
                    <div>（帳 簿 価 額）</div>
                  </td>
                  <td rowSpan={2} style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <NumberField value={g('total_assets')} onChange={(v) => u('total_assets', v)} />
                      <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>千円</span>
                    </div>
                  </td>
                  <td colSpan={2} rowSpan={4} className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top', fontSize: 7.5, lineHeight: 1.3 }}>
                    <div>［従業員数の内訳］</div>
                    <div style={{ marginTop: 3 }}>
                      直前期末以前１年間<br />における従業員数
                    </div>
                  </td>
                  <td rowSpan={4} style={{ verticalAlign: 'top', textAlign: 'left', padding: '2px 4px', fontSize: 7.5, lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div>
                        <div>継続勤務</div>
                        <div>従業員数</div>
                      </div>
                      <div>
                        <div>継続勤務従業員以外の従</div>
                        <div>業員の労働時間の合計時間数</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span>（</span>
                      <NumberField value={g('regular_emp')} onChange={(v) => u('regular_emp', v)} className="w-10" />
                      <span>人）＋</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span>（</span>
                      <NumberField value={g('part_hours')} onChange={(v) => u('part_hours', v)} className="w-14" />
                      <span>時間）</span>
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: 12 }}>1,800時間</div>
                  </td>
                </tr>
                {/* Row 2: 取引金額 */}
                <tr>
                  {/* 総資産 continues */}
                  {/* 金額 continues */}
                </tr>
                <tr>
                  <td colSpan={2} className="text-left" style={{ padding: '2px 4px' }}>
                    直前期末以前１年間<br />の取引金額
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <NumberField value={g('transaction_amount')} onChange={(v) => u('transaction_amount', v)} />
                      <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>千円</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="text-left" style={{ padding: '2px 4px', fontSize: 7.5 }}>
                    における従業員数
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <NumberField value={g('total_emp')} onChange={(v) => u('total_emp', v)} className="w-12" />
                      <span style={{ marginLeft: 2 }}>人</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ---- 70人判定 ---- */}
          <div style={{ fontSize: 8.5, ...bb }}>
            <div style={{ padding: '2px 8px', ...bb }}>
              70人以上の会社は、大会社（<CircledNumber n={6} />及び<CircledNumber n={7} />は不要）
            </div>
            <div style={{ padding: '2px 8px' }}>
              70人未満の会社は、<CircledNumber n={6} />及び<CircledNumber n={7} />により判定
            </div>
          </div>

          {/* ---- ⑤ 従業員数区分 ---- */}
          <div style={{ padding: '2px 4px', fontSize: 8.5, ...bb }}>
            <CircledNumber n={5} />　直前期末以前１年間における従業員数に応ずる区分
          </div>

          {/* ---- ⑥⑦ ヘッダー ---- */}
          <div style={{ display: 'flex', ...bb }}>
            <div style={{ flex: 1, padding: '2px 4px', fontSize: 7.5, ...br }}>
              <CircledNumber n={6} />　直前期末の総資産価額（帳簿価額）及び直前期末以前<br />
              　１年間における従業員数に応ずる区分
            </div>
            <div style={{ flex: 1, padding: '2px 4px', fontSize: 7.5 }}>
              <CircledNumber n={7} />　直前期末以前１年間の取引金額に応ずる区分
            </div>
          </div>

          {/* ---- 会社規模マトリクス ---- */}
          <div style={{ ...bb }}>
            <table className="gov-table" style={{ fontSize: 7 }}>
              <thead>
                <tr>
                  <th colSpan={3} style={{ fontSize: 7.5 }}>総 資 産 価 額（帳 簿 価 額）</th>
                  <th rowSpan={2} style={{ width: 45, fontSize: 7 }}>従業員数</th>
                  <th colSpan={3} style={{ fontSize: 7.5 }}>取　引　金　額</th>
                  <th rowSpan={2} style={{ width: 55, fontSize: 6.5, lineHeight: 1.2 }}>
                    会社規模とＬの<br />割合（中会社）<br />の区分
                  </th>
                </tr>
                <tr>
                  <th>卸 売 業</th>
                  <th style={{ fontSize: 6.5 }}>小売・サービ<br />ス業</th>
                  <th style={{ fontSize: 6.5 }}>卸売業、小売・<br />サービス業以外</th>
                  <th>卸 売 業</th>
                  <th style={{ fontSize: 6.5 }}>小売・サービ<br />ス業</th>
                  <th style={{ fontSize: 6.5 }}>卸売業、小売・<br />サービス業以外</th>
                </tr>
              </thead>
              <tbody>
                {/* 大会社 */}
                <tr style={{ height: 18 }}>
                  <td>20億円以上</td>
                  <td>15億円以上</td>
                  <td>15億円以上</td>
                  <td>35 人 超</td>
                  <td>30億円以上</td>
                  <td>20億円以上</td>
                  <td>15億円以上</td>
                  <td style={{ fontWeight: 700, letterSpacing: '0.3em' }}>大 会 社</td>
                </tr>
                {/* 中会社の大 0.90 */}
                <tr style={{ height: 22 }}>
                  <td>４億円以上<br />20億円未満</td>
                  <td>５億円以上<br />15億円未満</td>
                  <td>５億円以上<br />15億円未満</td>
                  <td>35 人 超</td>
                  <td>７億円以上<br />30億円未満</td>
                  <td>５億円以上<br />20億円未満</td>
                  <td>４億円以上<br />15億円未満</td>
                  <td>
                    <div>０．９０</div>
                  </td>
                </tr>
                {/* 中会社の中 0.75 */}
                <tr style={{ height: 22 }}>
                  <td>２億円以上<br />４億円未満</td>
                  <td style={{ fontSize: 6.5 }}>2億5,000万円以上<br />５億円未満</td>
                  <td style={{ fontSize: 6.5 }}>2億5,000万円以上<br />５億円未満</td>
                  <td style={{ fontSize: 6.5 }}>20 人 超<br />35 人 以下</td>
                  <td style={{ fontSize: 6.5 }}>3億5,000万円以上<br />７億円未満</td>
                  <td style={{ fontSize: 6.5 }}>2億5,000万円以上<br />５億円未満</td>
                  <td>２億円以上<br />４億円未満</td>
                  <td>
                    <div>０．７５</div>
                  </td>
                </tr>
                {/* 中会社の小 0.60 */}
                <tr style={{ height: 22 }}>
                  <td style={{ fontSize: 6.5 }}>7,000万円以上<br />２億円未満</td>
                  <td style={{ fontSize: 6.5 }}>4,000万円以上<br />2億5,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>5,000万円以上<br />2億5,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>５ 人 超<br />20 人 以下</td>
                  <td style={{ fontSize: 6.5 }}>２億円以上<br />3億5,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>6,000万円以上<br />2億5,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>8,000万円以上<br />２億円未満</td>
                  <td>
                    <div>０．６０</div>
                  </td>
                </tr>
                {/* 小会社 */}
                <tr style={{ height: 18 }}>
                  <td style={{ fontSize: 6.5 }}>7,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>4,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>5,000万円未満</td>
                  <td>５ 人 以下</td>
                  <td>２億円未満</td>
                  <td style={{ fontSize: 6.5 }}>6,000万円未満</td>
                  <td style={{ fontSize: 6.5 }}>8,000万円未満</td>
                  <td style={{ fontWeight: 700, letterSpacing: '0.3em' }}>小 会 社</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 注記 */}
          <div style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.3, ...bb }}>
            ・「会社規模とＬの割合（中会社）の区分」欄は、<CircledNumber n={6} />欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか
            下位の区分）と<CircledNumber n={7} />欄（取引金額）の区分とのいずれか上位の区分により判定します。
          </div>

          {/* ---- 判定結果 ---- */}
          <div style={{ ...bb }}>
            <table className="gov-table" style={{ fontSize: 8.5 }}>
              <tbody>
                <tr>
                  <td rowSpan={2} style={{ width: 20, writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 700, letterSpacing: '0.3em', background: '#f5f5f0' }}>
                    判定
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span className="gov-choice" onClick={() => u('size_result', '大会社')}>
                      大　会　社
                    </span>
                  </td>
                  <td colSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span>中　　　会　　　社</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span className="gov-choice" onClick={() => u('size_result', '小会社')}>
                      小　会　社
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span>Ｌ　の　割　合</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <span className="gov-choice" onClick={() => u('size_result', '中0.90')}>０．９０</span>
                      <span className="gov-choice" onClick={() => u('size_result', '中0.75')}>０．７５</span>
                      <span className="gov-choice" onClick={() => u('size_result', '中0.60')}>０．６０</span>
                    </div>
                  </td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ---- ４．増（減）資の状況その他評価上の参考事項 ---- */}
          <div style={{ padding: '2px 4px', fontWeight: 700, ...bb }}>
            ４．増（減）資の状況その他評価上の参考事項
          </div>
          <div style={{ flex: 1, padding: '4px' }}>
            <FormField
              value={g('capital_changes')}
              onChange={(v) => u('capital_changes', v)}
            />
          </div>
        </div>

        {/* 右サイドバー */}
        <div className="gov-side-header" style={{ ...bl, fontSize: 8, letterSpacing: '0.1em' }}>
          （令和六年一月一日以降用）
        </div>
      </div>
    </div>
  );
}
