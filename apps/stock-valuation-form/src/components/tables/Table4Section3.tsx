import { FormField } from '@/components/ui/FormField';
import { NumberField } from '@/components/ui/NumberField';
import { bb, br, hdr, vt } from './shared';
import type { GFn, UFn } from './shared';

interface Props {
  g: GFn;
  u: UFn;
}

/* ---- 類似業種ブロック (共通レンダラー) ---- */

function IndustryBlock({ prefix, resultNum, g, u }: { prefix: string; resultNum: string; g: GFn; u: UFn }) {
  const p = (f: string) => `${prefix}_${f}`;
  const rows = [
    { label: '課税時期の属する月', sub: '月' },
    { label: '属する月の前月', sub: '月' },
    { label: '属する月の前々月', sub: '月' },
    { label: '前年平均株価', sub: '' },
    { label: '課税時期の属する月以前２年間の平均株価', sub: '' },
  ];
  return (
    <div style={{ display: 'flex', ...bb }}>
      {/* 左: 類似業種 */}
      <div style={{ width: '46%', ...br, display: 'flex' }}>
        {/* 業種目 */}
        <div style={{ width: 80, ...br, fontSize: 6.5 }}>
          <div style={{ ...bb, padding: '1px 2px', textAlign: 'center' }}>
            類似業種と<br />業種目番号
          </div>
          <div style={{ ...bb, padding: '1px 2px', display: 'flex', alignItems: 'center', gap: 2 }}>
            <span>（No.</span>
            <FormField value={g(p('no'))} onChange={(v) => u(p('no'), v)} className="w-8" />
            <span>）</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ ...bb, padding: '1px 2px', display: 'flex', alignItems: 'center', fontSize: 6 }}>
              <span style={{ flex: 1 }}>{r.label}</span>
              {r.sub && (
                <>
                  <FormField value={g(p(`month_${i}`))} onChange={(v) => u(p(`month_${i}`), v)} className="w-4" />
                  <span>{r.sub}</span>
                </>
              )}
            </div>
          ))}
          <div style={{ padding: '1px 2px', fontSize: 6 }}>
            Ａ　上記のうち最も低いもの
          </div>
        </div>
        {/* 株価列 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6.5 }}>
            類似業種の株価
          </div>
          <div style={{ ...bb, padding: '1px 2px', fontSize: 6.5, textAlign: 'center' }}>&nbsp;</div>
          {rows.map((_, i) => (
            <div key={i} style={{ ...bb, padding: '1px 2px' }}>
              <NumberField value={g(p(`price_${i}`))} onChange={(v) => u(p(`price_${i}`), v)} unit="円" />
            </div>
          ))}
          <div style={{ padding: '1px 2px', display: 'flex', alignItems: 'center' }}>
            <NumberField value={g(p('price_a'))} onChange={(v) => u(p('price_a'), v)} unit="円" />
          </div>
        </div>
      </div>

      {/* 右: 比準要素 */}
      <div style={{ flex: 1, fontSize: 6.5 }}>
        <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '21.25%' }} />
            <col style={{ width: '21.25%' }} />
            <col style={{ width: '21.25%' }} />
            <col style={{ width: '21.25%' }} />
          </colgroup>
          <tbody>
            {/* ヘッダー */}
            <tr>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 6 }}>区　分</td>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
                1株(50円)当たりの<br />年配当金額の
              </td>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
                1株(50円)当たりの<br />年利益金額の
              </td>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
                1株(50円)当たりの<br />純資産価額の
              </td>
              <td style={{ ...bb, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
                1株(50円)当たりの<br />比 準 額
              </td>
            </tr>
            {/* 評価会社 */}
            <tr>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', whiteSpace: 'pre-line', fontSize: 6 }}>
                {'評価\n会社'}
              </td>
              {['b', 'c', 'd'].map((col) => (
                <td key={col} style={{ ...bb, ...br, padding: '1px 2px' }}>
                  <NumberField value={g(p(`ev_${col}`))} onChange={(v) => u(p(`ev_${col}`), v)} />
                  <div style={{ fontSize: 6 }}>{col === 'b' ? 'Ⓑ' : col === 'c' ? 'Ⓒ' : 'Ⓓ'}</div>
                </td>
              ))}
              <td rowSpan={3} style={{ ...bb, padding: '1px 2px', fontSize: 5.5, textAlign: 'center', verticalAlign: 'middle' }}>
                <div>③ × ⓑ × 0.7※</div>
                <div style={{ fontSize: 5 }}>※</div>
                <div style={{ fontSize: 5 }}>中会社は0.6</div>
                <div style={{ fontSize: 5 }}>小会社は0.5</div>
                <div style={{ fontSize: 5 }}>とします。</div>
              </td>
            </tr>
            {/* 類似業種 */}
            <tr>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', whiteSpace: 'pre-line', fontSize: 6 }}>
                {'類似\n業種'}
              </td>
              {['b', 'c', 'd'].map((col) => (
                <td key={col} style={{ ...bb, ...br, padding: '1px 2px' }}>
                  <NumberField value={g(p(`sim_${col}`))} onChange={(v) => u(p(`sim_${col}`), v)} />
                  <div style={{ fontSize: 6 }}>{col.toUpperCase()}</div>
                </td>
              ))}
            </tr>
            {/* 要素別比準割合 */}
            <tr>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
                要素別<br />比準割合
              </td>
              {['b', 'c', 'd'].map((col) => (
                <td key={col} style={{ ...bb, ...br, padding: '1px 2px' }}>
                  <div style={{ fontSize: 6, marginBottom: 1 }}>{col === 'b' ? 'Ⓑ÷B' : col === 'c' ? 'Ⓒ÷C' : 'Ⓓ÷D'}</div>
                  <NumberField value={g(p(`ratio_${col}`))} onChange={(v) => u(p(`ratio_${col}`), v)} />
                </td>
              ))}
            </tr>
            {/* 比準割合 */}
            <tr>
              <td style={{ ...bb, ...br, ...hdr, textAlign: 'center', padding: '1px', fontSize: 5.5 }}>
                比準割合
              </td>
              <td colSpan={3} style={{ ...bb, ...br, padding: '1px 2px', fontSize: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>（Ⓑ÷B ＋ Ⓒ÷C ＋ Ⓓ÷D）÷ ３：㉑</span>
                </div>
              </td>
              <td style={{ ...bb, padding: '1px 2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>㉒</span>
                  <NumberField value={g(p('hijun_ratio'))} onChange={(v) => u(p('hijun_ratio'), v)} />
                  <span className="whitespace-nowrap ml-0.5">円　銭</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}

/** ３　類似業種比準価額の計算 */
export function Table4Section3({ g, u }: Props) {
  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* セクション番号＋ラベル */}
      <div style={{ width: 20, ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 1px', fontSize: 7 }}>
        <span style={{ marginBottom: 2, fontWeight: 700 }}>３</span>
        <span style={{ ...vt, flex: 1, fontSize: 7 }}>類似業種比準価額の計算</span>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Block 1: 1株当たり */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 18, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ ...vt, fontSize: 6 }}>１株当たりの</span>
          </div>
          <div style={{ flex: 1 }}>
            <IndustryBlock prefix="blk1" resultNum="⑳" g={g} u={u} />
          </div>
        </div>

        {/* Block 2: 比準価額 */}
        <div style={{ display: 'flex', ...bb }}>
          <div style={{ width: 18, ...br, ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ ...vt, fontSize: 6 }}>比準価額の計算</span>
          </div>
          <div style={{ flex: 1 }}>
            <IndustryBlock prefix="blk2" resultNum="㉕" g={g} u={u} />
          </div>
        </div>

        {/* ---- 1株当たりの比準価額 ---- */}
        <div style={{ ...bb, display: 'flex', fontSize: 6.5 }}>
          <div style={{ ...br, padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            1株当たりの比準価額
          </div>
          <div style={{ flex: 1, ...br, padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6 }}>
            比準価額（⑳と㉕とのいずれか低い方の金額）×④の金額÷50円
          </div>
          <div style={{ padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontWeight: 500 }}>㉖</span>
            <NumberField value={g('hikijun_price')} onChange={(v) => u('hikijun_price', v)} className="w-16" />
            <span>円</span>
          </div>
        </div>

        {/* ---- 修正: 配当 ---- */}
        <div style={{ ...bb, padding: '2px 4px', fontSize: 6.5, display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div>直前期末の翌日から課税時期までの間に配当金交付の効力が発生した場合</div>
            <div style={{ fontSize: 6, paddingLeft: 8 }}>（㉖の金額）ー　1株当たりの配当金額</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 6.5 }}>
            <div>修正比準価額</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 2 }}>㉗</span>
              <NumberField value={g('modified_hikijun')} onChange={(v) => u('modified_hikijun', v)} className="w-14" />
              <span className="whitespace-nowrap ml-0.5">円</span>
            </div>
          </div>
        </div>

        {/* ---- 修正: 割当て ---- */}
        <div style={{ padding: '2px 4px', fontSize: 6.5, display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div>直前期末の翌日から課税時期までの間に株式の割当て等の効力が発生した場合</div>
            <div style={{ fontSize: 6, paddingLeft: 8, display: 'flex', gap: 8 }}>
              <span>比準価額</span>
              <span>割当株式1株当たりの払込金額</span>
              <span>1株当たりの割当株式数又は交付株式数</span>
            </div>
            <div style={{ fontSize: 6, paddingLeft: 8, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span>（㉖又は㉗があるときは㉗）の金額</span>
              <span>×</span>
              <NumberField value={g('mod2_price')} onChange={(v) => u('mod2_price', v)} className="w-8" />
              <span>円</span>
              <NumberField value={g('mod2_shares')} onChange={(v) => u('mod2_shares', v)} className="w-8" />
              <span>株）÷（1株＋</span>
              <NumberField value={g('mod2_ratio')} onChange={(v) => u('mod2_ratio', v)} className="w-6" />
              <span>株）</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 6.5 }}>
            <div>修正比準価額</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 2 }}>㉘</span>
              <NumberField value={g('modified_hikijun2')} onChange={(v) => u('modified_hikijun2', v)} className="w-14" />
              <span className="whitespace-nowrap ml-0.5">円</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
