import { bb } from '../shared';
import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

const SIZE_OPTIONS = [
  { value: '大会社', display: '１．００' },
  { value: '中0.90', display: '０．９０' },
  { value: '中0.75', display: '０．７５' },
  { value: '中0.60', display: '０．６０' },
  { value: '小会社', display: '０．５０' },
] as const;

export function SizeResult({ g, u }: Props) {
  return (
    <div style={{ ...bb }}>
      <table className="gov-table" style={{ fontSize: 8.5 }}>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ width: 20, writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 700, letterSpacing: '0.1em', background: '#f5f5f0', fontSize: 7.5 }}>
              判定（Lの割合）
            </td>
            <td style={{ fontWeight: 700 }}>
              <span className="gov-choice" onClick={() => u('size_result', '大会社')}>
                大　会　社
              </span>
            </td>
            <td colSpan={3}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span>中　　　会　　　社</span>
              </div>
            </td>
            <td style={{ fontWeight: 700 }}>
              <span className="gov-choice" onClick={() => u('size_result', '小会社')}>
                小　会　社
              </span>
            </td>
          </tr>
          <tr>
            {SIZE_OPTIONS.map(({ value, display }) => (
              <td key={value}>
                <span className={`gov-choice${g('size_result') === value ? ' selected' : ''}`} onClick={() => u('size_result', value)}>{display}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
