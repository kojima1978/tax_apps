import { FormField } from '@/components/ui/FormField';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function CapitalChanges({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 8.5 }}>
      <tbody>
        <tr>
          <td style={{ padding: '2px 4px', fontWeight: 700 }}>
            ４．増（減）資の状況その他評価上の参考事項
          </td>
        </tr>
        <tr>
          <td style={{ padding: '4px', height: 60 }}>
            <FormField
              value={g('capital_changes')}
              onChange={(v) => u('capital_changes', v)}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
