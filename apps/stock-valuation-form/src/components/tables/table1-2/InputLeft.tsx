import { NumberField } from '@/components/ui/NumberField';
import { bb } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function InputLeft({ g, u }: Props) {
  return (
    <div style={{ ...bb, flex: 1 }}>
      <table className="gov-table" style={{ fontSize: 8.5, height: '100%' }}>
        <thead>
          <tr>
            <th>項　　目</th>
            <th>金　　　額</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top' }}>
              <div>直前期末の総資産価額</div>
              <div>（帳 簿 価 額）</div>
            </td>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NumberField value={g('total_assets')} onChange={(v) => u('total_assets', v)} />
                <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>千円</span>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top' }}>
              <div>直前期末以前１年間</div>
              <div>の取引金額</div>
            </td>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NumberField value={g('transaction_amount')} onChange={(v) => u('transaction_amount', v)} />
                <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>千円</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
