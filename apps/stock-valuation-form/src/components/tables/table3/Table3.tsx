import { TableTitleBar } from '../TableTitleBar';
import type { TableProps } from '@/types/form';
import { Section1 } from './Section1';
import { Section2 } from './Section2';
import { Section3 } from './Section3';
import { Section4 } from './Section4';

const T = 'table3' as const;

export function Table3({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form" style={{ fontSize: 8.5 }}>
      <TableTitleBar
        title="第３表　一般の評価会社の株式及び株式に関する権利の価額の計算明細書"
        fontSize={10}
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Section1 g={g} u={u} />
        <Section2 g={g} u={u} />

        {/* 下段: セクション3＋4 */}
        <div style={{ display: 'flex' }}>
          <Section3 g={g} u={u} />
          <Section4 g={g} u={u} />
        </div>
      </div>
    </div>
  );
}
