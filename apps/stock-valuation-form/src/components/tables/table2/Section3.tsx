import { NumberField } from '@/components/ui/NumberField';
import { CircledNumber } from '@/components/ui/CircledNumber';
import { br } from '../shared';
import type { GFn, UFn } from './types';

const inputCell: React.CSSProperties = { padding: '1px 3px' };

export function Section3({ g, u }: { g: GFn; u: UFn }) {
  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid #000', height: '100%' }}>
      {/* 左ラベル（上下段を縦断） */}
      <div style={{ width: 85, ...br, fontSize: 7.5, padding: '2px 3px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        ３．土地保有特定会社
      </div>

      {/* 右: 上段テーブル + 下段マトリクス */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ===== 上段: 判定要素 + 会社の規模の判定（3行） ===== */}
        <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 7 }}>
          <colgroup>
            <col style={{ width: '21%' }} />{/* 総資産 */}
            <col style={{ width: '23%' }} />{/* 土地等 */}
            <col style={{ width: '16%' }} />{/* 土地保有割合 */}
            <col style={{ width: '40%' }} />{/* 会社の規模の判定 */}
          </colgroup>
          <tbody>
            {/* R1: 判定要素（全4列） */}
            <tr>
              <td colSpan={4} style={{ fontWeight: 500, letterSpacing: '1em' }}>判　定　要　素</td>
            </tr>
            {/* R2: 値ヘッダー | 会社の規模の判定ヘッダー */}
            <tr>
              <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
                <div>総 資 産 価 額</div>
                <div>（第５表の<CircledNumber n={1} />の金額）</div>
              </td>
              <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
                <div>土地等の価額の合計額</div>
                <div>（第５表のハの金額）</div>
              </td>
              <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
                <div>土地保有割合</div>
                <div>（<CircledNumber n={5} />／<CircledNumber n={4} />）</div>
              </td>
              <td style={{ fontSize: 6.5, lineHeight: 1.3 }}>
                <div>会 社 の 規 模 の 判 定</div>
                <div style={{ fontSize: 5.5 }}>（該当する文字を○で囲んで表示します。）</div>
              </td>
            </tr>
            {/* R3: 入力 | 大会社・中会社・小会社 */}
            <tr>
              <td style={inputCell}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CircledNumber n={4} />
                  <NumberField value={g('total_assets_3')} onChange={(v) => u('total_assets_3', v)} />
                  <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
                </div>
              </td>
              <td style={inputCell}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CircledNumber n={5} />
                  <NumberField value={g('land_value_3')} onChange={(v) => u('land_value_3', v)} />
                  <span style={{ whiteSpace: 'nowrap', marginLeft: 1 }}>千円</span>
                </div>
              </td>
              <td style={inputCell}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CircledNumber n={6} />
                  <NumberField value={g('land_ratio_3')} onChange={(v) => u('land_ratio_3', v)} />
                  <span style={{ marginLeft: 1 }}>％</span>
                </div>
              </td>
              <td style={{ letterSpacing: '0.2em' }}>大会社・中会社・小会社</td>
            </tr>
          </tbody>
        </table>

        {/* ===== 下段: 判定基準マトリクス（大2・中2・小4 = 8データ列） ===== */}
        <table className="gov-table" style={{ tableLayout: 'fixed', fontSize: 6.5, flex: 1 }}>
          <colgroup>
            <col style={{ width: '5%' }} />{/* 判定基準 横 */}
            <col style={{ width: '12%' }} />{/* 行ラベル */}
            <col style={{ width: '9%' }} />{/* 大: 70%以上 */}
            <col style={{ width: '9%' }} />{/* 大: 70%未満 */}
            <col style={{ width: '9%' }} />{/* 中: 90%以上 */}
            <col style={{ width: '9%' }} />{/* 中: 90%未満 */}
            <col style={{ width: '13%' }} />{/* 小A: 70%以上 */}
            <col style={{ width: '13%' }} />{/* 小A: 70%未満 */}
            <col style={{ width: '13%' }} />{/* 小B: 90%以上 */}
            <col style={{ width: '13%' }} />{/* 小B: 90%未満 */}
          </colgroup>
          <tbody>
            {/* R1: 会社の規模ヘッダー（大会社・中会社はR1+R2結合 / 小会社に注記） */}
            <tr>
              <td rowSpan={3} style={{ fontWeight: 500, fontSize: 6.5, lineHeight: 1.2 }}>判定<br />基準</td>
              <td rowSpan={2}>会社の規模</td>
              <td rowSpan={2} colSpan={2} style={{ verticalAlign: 'middle' }}>大　会　社</td>
              <td rowSpan={2} colSpan={2} style={{ verticalAlign: 'middle' }}>中　会　社</td>
              <td colSpan={4} style={{ fontSize: 6, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 500 }}>小　会　社</div>
                <div style={{ fontSize: 5.5 }}>（総資産価額（帳簿価額）が次の基準に該当する会社）</div>
              </td>
            </tr>
            {/* R2: 小会社の総資産基準（2サブブロック） */}
            <tr>
              <td colSpan={2} style={{ textAlign: 'left', padding: '1px 2px', fontSize: 5.5, lineHeight: 1.4 }}>
                <div>・卸売業　20億円以上</div>
                <div>・小売・サービス業　15億円以上</div>
                <div>・上記以外の業種　15億円以上</div>
              </td>
              <td colSpan={2} style={{ textAlign: 'left', padding: '1px 2px', fontSize: 5.5, lineHeight: 1.4 }}>
                <div>・卸売業　7,000万円以上20億円未満</div>
                <div>・小売・サービス業　4,000万円以上15億円未満</div>
                <div>・上記以外の業種　5,000万円以上15億円未満</div>
              </td>
            </tr>
            {/* R3: ⑥の割合 */}
            <tr>
              <td><CircledNumber n={6} />の割合</td>
              <td>70％以上</td>
              <td>70％未満</td>
              <td>90％以上</td>
              <td>90％未満</td>
              <td>70％以上</td>
              <td>70％未満</td>
              <td>90％以上</td>
              <td>90％未満</td>
            </tr>
            {/* R4: 判定（縦ラベル列＋行ラベル列を横断） */}
            <tr>
              <td colSpan={2} style={{ fontWeight: 500, letterSpacing: '0.5em' }}>判　定</td>
              <td>該 当</td>
              <td>非該当</td>
              <td>該 当</td>
              <td>非該当</td>
              <td>該 当</td>
              <td>非該当</td>
              <td>該 当</td>
              <td>非該当</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
