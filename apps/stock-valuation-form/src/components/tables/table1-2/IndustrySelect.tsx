import type { GFn, UFn } from '../shared';

interface Props {
  g: GFn;
  u: UFn;
}

export function IndustrySelect({ g, u }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 8.5 }}>
      <tbody>
        <tr>
          <td colSpan={3} style={{ padding: '2px 4px', fontWeight: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>規模区分を判定する場合の業種</span>
              <a
                className="no-print"
                href="https://www.nta.go.jp/law/joho-zeikaishaku/hyoka/250600/pdf/02.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 8, fontSize: 7, color: '#1565c0', textDecoration: 'underline', fontWeight: 400 }}
              >
                （別表）対比表（令和７年分）PDF
              </a>
            </div>
          </td>
        </tr>
        <tr>
          {(['卸売業', '小売・サービス', '卸売業、小売・サービス業以外'] as const).map((label) => (
            <td
              key={label}
              className={`gov-choice${g('industry_type') === label ? ' selected' : ''}`}
              style={{ padding: '3px 4px', textAlign: 'center', cursor: 'pointer', width: '33.33%' }}
              onClick={() => u('industry_type', label)}
            >
              {label}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
