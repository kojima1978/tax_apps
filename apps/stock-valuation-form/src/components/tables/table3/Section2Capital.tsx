import { NumberField } from '@/components/ui/NumberField';
import { bb, br, hdr } from '../shared';
import type { GFn, UFn } from '../shared';

const CAPITAL_FIELDS = [
  { label: <>直前期末の<br />資本金等の額</>, num: '⑨', key: 'capital_amount', unit: '千円', flex: 1 },
  { label: <>直前期末の<br />発行済株式数</>, num: '⑩', key: 'issued_shares', unit: '株', flex: 1 },
  { label: <>直前期末の<br />自己株式数</>, num: '⑪', key: 'treasury_shares', unit: '株', flex: 1 },
  { label: <>1株当たりの資本金等<br />の額を50円とした場合<br />の発行済株式数<br />（⑨÷50円）</>, num: '⑫', key: 'shares_50yen', unit: '株', flex: 1.3 },
  { label: <>１株当たりの<br />資本金等の額<br />（⑨÷（⑩−⑪））</>, num: '⑬', key: 'capital_per_share', unit: '円', flex: 1 },
];

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2Capital({ g, u }: Props) {
  return (
    <div style={{ display: 'flex', ...bb, flex: 1 }}>
      <div style={{ width: 90, ...br, ...hdr, padding: '2px 3px', fontSize: 7, textAlign: 'center', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        １株当たりの<br />資本金等の額、<br />発行済株式数等
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', ...bb, fontSize: 6.5, textAlign: 'center' }}>
          {CAPITAL_FIELDS.map((f, i) => (
            <div key={f.key} style={{ flex: f.flex, ...(i < CAPITAL_FIELDS.length - 1 ? br : {}), padding: '1px 2px', ...hdr, lineHeight: 1.3 }}>
              {f.label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 7.5 }}>
          {CAPITAL_FIELDS.map((f, i) => (
            <div key={f.key} style={{ flex: f.flex, ...(i < CAPITAL_FIELDS.length - 1 ? br : {}), padding: '2px 3px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 2 }}>{f.num}</span>
              <NumberField value={g(f.key)} onChange={(v) => u(f.key, v)} />
              <span className="whitespace-nowrap ml-0.5">{f.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
