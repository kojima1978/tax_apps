import { NumberField } from '@/components/ui/NumberField';
import { hdr } from '../shared';
import type { GFn, UFn } from '../shared';

const CAPITAL_FIELDS = [
  { label: <>直前期末の<br />資本金等の額</>, num: '⑨', key: 'capital_amount', unit: '千円' },
  { label: <>直前期末の<br />発行済株式数</>, num: '⑩', key: 'issued_shares', unit: '株' },
  { label: <>直前期末の<br />自己株式数</>, num: '⑪', key: 'treasury_shares', unit: '株' },
  { label: <>1株当たりの資本金等<br />の額を50円とした場合<br />の発行済株式数<br />（⑨÷50円）</>, num: '⑫', key: 'shares_50yen', unit: '株' },
  { label: <>１株当たりの<br />資本金等の額<br />（⑨÷（⑩−⑪））</>, num: '⑬', key: 'capital_per_share', unit: '円' },
];

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2Capital({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 6.5, tableLayout: 'fixed', width: '100%' }}>
      <colgroup>
        <col style={{ width: '15%' }} />
        {CAPITAL_FIELDS.map((f) => (
          <col key={f.key} />
        ))}
      </colgroup>
      <tbody>
        <tr style={{ height: '50%' }}>
          <td rowSpan={2} style={{ ...hdr, padding: '2px 3px', fontSize: 7, textAlign: 'center', lineHeight: 1.4 }}>
            １株当たりの<br />資本金等の額、<br />発行済株式数等
          </td>
          {CAPITAL_FIELDS.map((f) => (
            <td key={f.key} style={{ padding: '1px 2px', ...hdr, lineHeight: 1.3, textAlign: 'center' }}>
              {f.label}
            </td>
          ))}
        </tr>
        <tr style={{ fontSize: 7.5, height: '50%' }}>
          {CAPITAL_FIELDS.map((f) => (
            <td key={f.key} style={{ padding: '2px 3px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 2 }}>{f.num}</span>
                <NumberField value={g(f.key)} onChange={(v) => u(f.key, v)} />
                <span className="whitespace-nowrap ml-0.5">{f.unit}</span>
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
