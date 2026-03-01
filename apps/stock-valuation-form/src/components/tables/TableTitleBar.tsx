import { FormField } from '@/components/ui/FormField';
import { bb, bl } from './shared';

interface TableTitleBarProps {
  title: string;
  fontSize?: number;
  companyName?: { value: string; onChange: (v: string) => void };
  companyNameReadonly?: string;
  extra?: React.ReactNode;
}

export function TableTitleBar({ title, fontSize = 9.5, companyName, companyNameReadonly, extra }: TableTitleBarProps) {
  const hasReadonly = companyNameReadonly !== undefined;
  return (
    <div style={{ display: 'flex', alignItems: 'center', ...bb }}>
      <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize, whiteSpace: 'nowrap' }}>
        {title}
      </div>
      {(companyName || hasReadonly) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', whiteSpace: 'nowrap', ...bl }}>
          <span>会社名</span>
          {companyName
            ? <FormField value={companyName.value} onChange={companyName.onChange} className="w-32" />
            : <span style={{ minWidth: 80 }}>{companyNameReadonly}</span>
          }
        </div>
      )}
      {extra}
    </div>
  );
}
