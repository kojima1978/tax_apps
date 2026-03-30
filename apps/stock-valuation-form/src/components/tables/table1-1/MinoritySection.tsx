import { FormField } from '@/components/ui/FormField';
import { ResetButton } from '@/components/ui/ResetButton';
import type { GFn, UFn } from '../shared';

const hl = { background: '#fff8e1', fontWeight: 700 } as const;
const choiceCell: React.CSSProperties = { fontSize: 7.5, padding: '1px 3px' };

const MINORITY_ITEMS = [
  { field: 'minority_officer', label: <>㋥ 役　員</>, yes: 'である', yesText: 'である → 原則的評価方式等', no: 'でない', noText: 'でない（次の㋭へ）' },
  { field: 'minority_central', label: <>㋭ 納税義務者が<br />中心的な同族株主</>, yes: 'である', yesText: 'である → 原則的評価方式等', no: 'でない', noText: 'でない（次の㋬へ）' },
  { field: 'minority_central_other', label: <>㋬ 納税義務者以外に<br />中心的な同族株主<br />（または株主）</>, yes: 'がいる', yesText: 'がいる → 配当還元方式', no: 'がいない', noText: 'がいない → 原則的評価方式等' },
];

const MINORITY_FIELDS = ['minority_name', 'minority_officer', 'minority_central', 'minority_central_other'] as const;

interface Props {
  g: GFn;
  u: UFn;
  minorityResult: '原則的評価方式等' | '配当還元方式' | null;
}

export function MinoritySection({ g, u, minorityResult }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 8, flex: 1 }}>
      <thead>
        {/* タイトル行 */}
        <tr>
          <th colSpan={3} style={{ fontWeight: 700, textAlign: 'left', padding: '2px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>２．少数株式所有者の評価方式の判定</span>
              <ResetButton onClick={() => MINORITY_FIELDS.forEach((f) => u(f, ''))} />
            </div>
          </th>
        </tr>
        <tr>
          <th style={{ width: '30%' }}>項　　目</th>
          <th colSpan={2}>判　定　内　容</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ height: 18 }}>
          <td className="text-left" style={{ padding: '1px 3px' }}>氏　名</td>
          <td colSpan={2}><FormField value={g('minority_name')} onChange={(v) => u('minority_name', v)} /></td>
        </tr>
        {MINORITY_ITEMS.map(({ field, label, yes, yesText, no, noText }) => (
          <tr key={field} style={{ height: 20 }}>
            <td className="text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>{label}</td>
            <td style={choiceCell} className={`gov-choice${g(field) === yes ? ' selected' : ''}`} onClick={() => u(field, yes)}>
              {yesText}
            </td>
            <td style={choiceCell} className={`gov-choice${g(field) === no ? ' selected' : ''}`} onClick={() => u(field, no)}>
              {noText}
            </td>
          </tr>
        ))}
        {/* 判定結果 */}
        <tr style={{ height: 22 }}>
          <td className="gov-header" style={{ fontWeight: 700, letterSpacing: '0.3em', textAlign: 'center' }}>判　定</td>
          {([
            { label: '原則的評価方式等', key: '原則的評価方式等' as const },
            { label: '配当還元方式', key: '配当還元方式' as const },
          ]).map(({ label, key }) => (
            <td key={key} style={{ textAlign: 'center', padding: '1px 3px', ...(minorityResult === key ? hl : {}) }}>
              {label}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
