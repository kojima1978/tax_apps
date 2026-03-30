import { FormField } from '@/components/ui/FormField';
import { hdr } from '../shared';
import type { GFn, UFn } from '../shared';

const lbl: React.CSSProperties = {
  ...hdr, padding: '1px 3px', whiteSpace: 'nowrap',
  textAlign: 'center' as const,
};

interface Props {
  g: GFn;
  u: UFn;
}

export function HeaderRight({ g, u }: Props) {
  return (
    <div>
      <table className="gov-table" style={{ height: '100%', fontSize: 8.5 }}>
        <colgroup>
          <col style={{ width: 30 }} />
          <col />
          <col style={{ width: 50 }} />
          <col style={{ width: 65 }} />
        </colgroup>
        <tbody>
          {/* 本店の所在地 */}
          <tr>
            <td style={{ ...lbl, fontSize: 8, lineHeight: 1.2 }}>本店の<br />所在地</td>
            <td colSpan={3}><FormField value={g('address')} onChange={(v) => u('address', v)} className="px-1" /></td>
          </tr>
          {/* 事業内容ヘッダー */}
          <tr>
            <td rowSpan={5} style={{ ...lbl, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.2em' }}>
              事業内容
            </td>
            <td style={{ ...lbl, fontSize: 7 }}>取扱品目及び製造、卸売、小売等の区分</td>
            <td style={{ ...lbl, fontSize: 7 }}>業種目番号</td>
            <td style={{ ...lbl, fontSize: 7 }}>取引金額の構成比</td>
          </tr>
          {/* 事業内容4行 */}
          {[0, 1, 2, 3].map((row) => (
            <tr key={row}>
              <td style={{ padding: '1px 3px' }}>
                <FormField value={g(`businessDesc_${row}`)} onChange={(v) => u(`businessDesc_${row}`, v)} />
              </td>
              <td style={{ padding: '1px 2px' }}>
                <FormField value={g(`businessCode_${row}`)} onChange={(v) => u(`businessCode_${row}`, v)} textAlign="center" />
              </td>
              <td style={{ padding: '1px 2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <FormField value={g(`salesRatio_${row}`)} onChange={(v) => u(`salesRatio_${row}`, v)} className="w-10" textAlign="right" />
                  <span style={{ marginLeft: 1 }}>%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
