import { br, hdr, vt } from '../shared';
import type { GFn, UFn } from '../shared';
import { Section2Capital } from './Section2Capital';
import { Section2DividendTable } from './Section2DividendTable';
import { Section2DividendPerShare } from './Section2DividendPerShare';
import { Section2DividendReturn } from './Section2DividendReturn';

interface Props {
  g: GFn;
  u: UFn;
}

export function Section2({ g, u }: Props) {
  return (
    <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
      <div style={{ width: '5%', ...br, ...hdr, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', fontSize: 8 }}>
        <span style={{ marginBottom: 4, fontWeight: 700 }}>２</span>
        <span style={{ ...vt, flex: 1 }}>配当還元方式による価額</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Section2Capital g={g} u={u} />
        <Section2DividendTable g={g} u={u} />
        <Section2DividendPerShare g={g} u={u} />
        <Section2DividendReturn g={g} u={u} />
      </div>
    </div>
  );
}
