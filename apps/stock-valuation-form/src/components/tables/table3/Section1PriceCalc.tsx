import { NumberField } from '@/components/ui/NumberField';
import type { GFn, UFn } from '../shared';

const COMPANY_SIZES = [
  {
    label: <>大 会 社 の<br />株式の価額</>,
    description: (
      <>
        <div>次のうちいずれか低い方の金額（②の記載がないときは①の金額）</div>
        <div style={{ paddingLeft: 8 }}>イ　①の金額</div>
        <div style={{ paddingLeft: 8 }}>ロ　②の金額</div>
      </>
    ),
    num: '④',
    key: 'large_price',
  },
  {
    label: <>中 会 社 の<br />株式の価額</>,
    num: '⑤',
    key: 'medium_price',
    hasLRatio: true,
  },
  {
    label: <>小 会 社 の<br />株式の価額</>,
    description: (
      <>
        <div>次のうちいずれか低い方の金額</div>
        <div style={{ paddingLeft: 8 }}>イ　②の金額（③の金額があるときは③の金額）</div>
        <div style={{ paddingLeft: 8 }}>ロ（①の金額 × 0.50）＋（イの金額 × 0.50）</div>
      </>
    ),
    num: '⑥',
    key: 'small_price',
  },
] as const;

interface Props {
  g: GFn;
  u: UFn;
}

export function Section1PriceCalc({ g, u }: Props) {
  return (
    <>
      {COMPANY_SIZES.map((row) => (
        <tr key={row.key}>
          <td className="gov-header" style={{ fontSize: 7.5, lineHeight: 1.4 }}>{row.label}</td>
          <td style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.4, textAlign: 'left' }}>
            {'hasLRatio' in row && row.hasLRatio ? (
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>（①と②とのいずれか低い方の金額 × Ｌの割合　0.</span>
                <NumberField value={g('l_ratio')} onChange={(v) => u('l_ratio', v)} className="w-8" />
                <span>）＋（②の金額（③の金額があるときは③の金額）×（１－Ｌの割合　0.</span>
                <NumberField value={g('l_ratio_inv')} onChange={(v) => u('l_ratio_inv', v)} className="w-8" />
                <span>））</span>
              </div>
            ) : 'description' in row ? row.description : null}
          </td>
          <td style={{ textAlign: 'left', padding: '2px 4px' }}>
            <div>{row.num}</div>
            <NumberField value={g(row.key)} onChange={(v) => u(row.key, v)} unit="円" />
          </td>
        </tr>
      ))}
    </>
  );
}
