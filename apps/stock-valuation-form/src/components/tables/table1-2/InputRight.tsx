import { NumberField } from '@/components/ui/NumberField';
import { bb } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
  totalEmpDisplay: string;
}

const rowTd: React.CSSProperties = { padding: '1px 3px', fontSize: 7.5 };

export function InputRight({ g, u, totalEmpDisplay }: Props) {
  return (
    <div style={{ ...bb, flex: 1 }}>
      <table className="gov-table" style={{ fontSize: 8.5, height: '100%' }}>
        <thead>
          <tr>
            <th>項　　目</th>
            <th colSpan={2}>人　　　数</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={3} className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top', fontSize: 7.5, lineHeight: 1.3 }}>
              <div>直前期末以前１年間</div>
              <div>における従業員数</div>
            </td>
            <td className="text-left" style={rowTd}>正社員</td>
            <td style={rowTd}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <NumberField value={g('regular_emp')} onChange={(v) => u('regular_emp', v)} className="w-10" />
                <span style={{ marginLeft: 1 }}>人</span>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-left" style={rowTd}>正社員以外</td>
            <td style={rowTd}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <NumberField value={g('part_emp')} onChange={(v) => u('part_emp', v)} className="w-10" />
                <span style={{ marginLeft: 1 }}>人</span>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-left" style={{ ...rowTd, fontWeight: 700 }}>合計</td>
            <td style={rowTd}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  readOnly
                  value={totalEmpDisplay}
                  className="gov-input gov-input-number w-10"
                  style={{ background: '#f5f5f0', cursor: 'default' }}
                  tabIndex={-1}
                />
                <span style={{ marginLeft: 1 }}>人</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
