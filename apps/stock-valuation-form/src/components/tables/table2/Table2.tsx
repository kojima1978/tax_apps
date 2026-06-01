import { TableTitleBar } from '../TableTitleBar';
import type { TableProps } from '@/types/form';
import { Section1 } from './Section1';
import { Section2 } from './Section2';
import { Section3 } from './Section3';
import { Section4 } from './Section4';
import { Section56 } from './Section56';
import { Section7 } from './Section7';

const T = 'table2' as const;

export function Table2({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  return (
    <div className="gov-form">
      <TableTitleBar
        title="第２表　特定の評価会社の判定の明細書"
        fontSize={11}
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Section1 g={g} u={u} />
        <Section2 g={g} u={u} />
        <Section3 g={g} u={u} />
        <Section4 g={g} u={u} />
        <Section56 />
        <Section7 />
      </div>
    </div>
  );
}
