import { FormField } from '@/components/ui/FormField';
import { hdr } from '../shared';
import type { GFn, UFn } from '../shared';

const lbl: React.CSSProperties = {
  ...hdr, padding: '1px 3px', whiteSpace: 'nowrap',
  textAlign: 'center' as const,
};

const formatWareki = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const wareki = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
  return `${wareki}（${d.getFullYear()}年）`;
};

interface Props {
  g: GFn;
  u: UFn;
}

export function HeaderLeft({ g, u }: Props) {
  return (
    <div style={{ borderRight: '0.5px solid #000' }}>
      <table className="gov-table" style={{ height: '100%', fontSize: 8.5 }}>
        <colgroup>
          <col style={{ width: 60 }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td style={lbl}>会 社 名</td>
            <td><FormField value={g('companyName')} onChange={(v) => u('companyName', v)} className="px-1" /></td>
          </tr>
          <tr>
            <td style={lbl}>代表者氏名</td>
            <td><FormField value={g('representative')} onChange={(v) => u('representative', v)} className="px-1" /></td>
          </tr>
          <tr>
            <td style={lbl}>課税時期</td>
            <td style={{ padding: '1px 3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <input type="date" className="gov-input" style={{ width: 'auto', flex: '0 0 auto' }} value={g('taxDate')} onChange={(e) => u('taxDate', e.target.value)} />
                <span style={{ fontSize: 8, color: '#333' }}>{formatWareki(g('taxDate'))}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td rowSpan={2} style={lbl}>直 前 期</td>
            <td style={{ padding: '1px 3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>自</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <input type="date" className="gov-input" style={{ width: 'auto', flex: '0 0 auto' }} value={g('fiscalStart')} onChange={(e) => u('fiscalStart', e.target.value)} />
                  <span style={{ fontSize: 7.5, color: '#333' }}>{formatWareki(g('fiscalStart'))}</span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '1px 3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>至</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <input type="date" className="gov-input" style={{ width: 'auto', flex: '0 0 auto' }} value={g('fiscalEnd')} onChange={(e) => u('fiscalEnd', e.target.value)} />
                  <span style={{ fontSize: 7.5, color: '#333' }}>{formatWareki(g('fiscalEnd'))}</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
