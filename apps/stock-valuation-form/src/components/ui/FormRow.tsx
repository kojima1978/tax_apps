import type { ReactNode } from 'react';

interface FormRowProps {
  label?: ReactNode;
  children: ReactNode;
  labelWidth?: string;
  className?: string;
  labelClassName?: string;
}

export function FormRow({
  label,
  children,
  labelWidth = '120px',
  className = '',
  labelClassName = '',
}: FormRowProps) {
  return (
    <div className={`flex gov-cell-b ${className}`}>
      {label !== undefined && (
        <div
          className={`gov-header gov-cell-r flex items-center justify-center shrink-0 ${labelClassName}`}
          style={{ width: labelWidth }}
        >
          {label}
        </div>
      )}
      <div className="flex-1 flex items-center px-1">{children}</div>
    </div>
  );
}
