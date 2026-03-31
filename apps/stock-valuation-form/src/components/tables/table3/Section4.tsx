import { NumberField } from '@/components/ui/NumberField';
import { bb, br, hdr } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section4({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ width: '32%', fontSize: 7.5 }}>
      <thead>
        <tr>
          <th colSpan={2} style={{ padding: '3px 6px', fontWeight: 700, textAlign: 'center', fontSize: 7.5 }}>
            ４．株式及び株式に関する<br />権利の価額<br />（１．及び２．に共通）
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ width: '50%', padding: '4px 6px', textAlign: 'center', ...hdr, fontSize: 7 }}>
            株式の評価額
          </td>
          <td style={{ width: '50%', padding: '4px 6px', textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <NumberField value={g('stock_value_1')} onChange={(v) => u('stock_value_1', v)} className="flex-1" />
              <span className="whitespace-nowrap ml-0.5">円</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ width: '50%', padding: '4px 6px', textAlign: 'center', ...hdr, fontSize: 7, lineHeight: 1.3 }}>
            株式に関する<br />権利の評価額
          </td>
          <td style={{ width: '50%', padding: '4px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 7 }}>
              <span>（</span>
              <NumberField value={g('rights_value_yen')} onChange={(v) => u('rights_value_yen', v)} className="flex-1" />
              <span className="mx-0.5">円</span>
              <NumberField value={g('rights_value_sen')} onChange={(v) => u('rights_value_sen', v)} className="flex-1" />
              <span>銭）</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
