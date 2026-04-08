import { formatYen } from '@/lib/utils';

interface FieldRowProps {
  symbol: string;
  symbolColor?: string;
  label: string;
  children?: React.ReactNode;
  resultValue?: number;
  resultLabel?: string;
  subText?: string;
}

export default function FieldRow({
  symbol,
  symbolColor = 'bg-blue-100 text-blue-800',
  label,
  children,
  resultValue,
  resultLabel,
  subText,
}: FieldRowProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 py-2">
      <span className={`field-label-symbol mt-0.5 ${symbolColor}`}>{symbol}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {subText && <div className="text-xs text-gray-500 mt-0.5">{subText}</div>}
        {children && <div className="mt-1">{children}</div>}
      </div>
      {resultValue !== undefined && (
        <div className="text-right min-w-[120px]">
          {resultLabel && <div className="text-xs text-gray-500">{resultLabel}</div>}
          <div className="font-mono-num text-sm font-medium text-gray-900">
            {formatYen(resultValue)}<span className="text-xs text-gray-500 ml-0.5">円</span>
          </div>
        </div>
      )}
    </div>
  );
}
