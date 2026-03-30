import { bb } from '../shared';

const DEFINITIONS = [
  { term: '同族関係者グループ', desc: '株主の1人及びその同族関係者（法人税法施行令第4条に規定する特殊の関係のある個人又は法人をいいます。）の有する議決権の合計数が最も多いグループをいいます。' },
  { term: '筆頭株主グループ', desc: '納税義務者の属する同族関係者グループ中、議決権数が最も多い株主（筆頭株主）の1人及びその同族関係者の有する議決権の合計数のグループをいいます。' },
  { term: '中心的な同族株主', desc: '課税時期において同族株主の1人並びにその株主の配偶者、直系血族、兄弟姉妹及び1親等の姻族（これらの者の同族関係者である会社のうち、これらの者が有する議決権の合計数がその会社の議決権総数の25%以上である会社を含みます。）の有する議決権の合計数がその会社の議決権総数の25%以上である場合におけるその株主をいいます。' },
  { term: '中心的な株主', desc: '課税時期において株主の1人及びその同族関係者の有する議決権の合計数がその会社の議決権総数の15%以上であるグループのうちに、いずれかのグループに単独でその会社の議決権総数の10%以上の議決権を有する株主がいる場合におけるその株主をいいます。' },
];

const defTermStyle: React.CSSProperties = { whiteSpace: 'nowrap', textAlign: 'left', verticalAlign: 'top' };

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function DefinitionsPanel({ open, onToggle }: Props) {
  return (
    <div className="no-print" style={{ ...bb }}>
      <div
        style={{ padding: '2px 4px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={onToggle}
      >
        <span>（参考）用語の定義</span>
        <span style={{ fontSize: 9, fontWeight: 400 }}>{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </div>
      {open && (
        <div style={{ padding: '2px 4px', fontSize: 7.5, lineHeight: 1.5 }}>
          <table className="gov-table" style={{ fontSize: 7.5 }}>
            <tbody>
              {DEFINITIONS.map(({ term, desc }) => (
                <tr key={term}>
                  <td className="gov-header" style={{ width: '15%', ...defTermStyle }}>{term}</td>
                  <td style={{ padding: '1px 4px', textAlign: 'left' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
