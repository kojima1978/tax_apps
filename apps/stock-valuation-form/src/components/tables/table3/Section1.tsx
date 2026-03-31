import type { GFn, UFn } from '../shared';
import { Section1Header } from './Section1Header';
import { Section1PriceCalc } from './Section1PriceCalc';
import { Section1Modification } from './Section1Modification';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section1({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 8, borderBottom: '1.5px solid #000', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '5%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '13%' }} />
        <col />
        <col />
        <col />
      </colgroup>
      <tbody>
        <Section1Header g={g} u={u} />
        <Section1PriceCalc g={g} u={u} />
        <Section1Modification g={g} u={u} />
      </tbody>
    </table>
  );
}
