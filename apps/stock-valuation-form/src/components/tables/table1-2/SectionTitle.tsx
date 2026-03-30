import { bb } from '../shared';

interface Props {
  onReset: () => void;
}

export function SectionTitle({ onReset }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', ...bb }}>
      <div style={{ flex: 1, padding: '2px 4px', fontWeight: 700 }}>
        ３．会社の規模（Ｌの割合）の判定
      </div>
      <button
        className="no-print"
        style={{ padding: '1px 8px', fontSize: 7, cursor: 'pointer', marginRight: 4, border: '1px solid #999', borderRadius: 2, background: '#fff' }}
        onClick={onReset}
      >
        リセット
      </button>
    </div>
  );
}
