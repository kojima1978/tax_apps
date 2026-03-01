import { NumberField } from '@/components/ui/NumberField';
import { Computed } from '@/components/ui/Computed';
import { br, hdr, parseNum } from './shared';
import type { GFn, UFn } from './shared';

interface Props {
  g: GFn;
  u: UFn;
  treasuryShares: number;
}

/** 1.1　1株当たりの資本金等の額等の計算 */
export function Table4Section1({ g, u, treasuryShares }: Props) {
  const capital = parseNum(g('capital'));
  const issuedShares = parseNum(g('issued_shares'));
  const netShares = issuedShares - treasuryShares;
  const capitalPerShare = capital > 0 && netShares > 0 ? Math.round(capital * 1000 / netShares) : null;
  const shares50yen = capital > 0 ? capital * 20 : null;

  return (
    <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
      <div style={{ width: 90, ...br, ...hdr, padding: '2px 3px', fontSize: 7, textAlign: 'center', lineHeight: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        1.1　1株当たりの資本金<br />等の額等の計算
      </div>
      <div style={{ flex: 1 }}>
        <table className="gov-table" style={{ fontSize: 6, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ lineHeight: 1.3 }}>直前期末の<br />資本金等の額</th>
              <th style={{ lineHeight: 1.3 }}>直前期末の<br />発行済株式数</th>
              <th style={{ lineHeight: 1.3 }}>直前期末の<br />自己株式数</th>
              <th style={{ lineHeight: 1.3 }}>1株当たりの資本金等の額<br />（①÷（②−③））</th>
              <th style={{ lineHeight: 1.3 }}>1株当たりの資本金等の額を<br />50円とした場合の発行済株式数<br />（①÷50円）</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontSize: 7 }}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>①</span>
                  <NumberField value={g('capital')} onChange={(v) => u('capital', v)} />
                  <span className="whitespace-nowrap ml-0.5">千円</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>②</span>
                  <NumberField value={g('issued_shares')} onChange={(v) => u('issued_shares', v)} />
                  <span className="whitespace-nowrap ml-0.5">株</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>③</span>
                  <Computed value={treasuryShares || null} unit="株" />
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>④</span>
                  <Computed value={capitalPerShare} />
                  <span className="whitespace-nowrap ml-0.5">円</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 2 }}>⑤</span>
                  <Computed value={shares50yen} />
                  <span className="whitespace-nowrap ml-0.5">株</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
