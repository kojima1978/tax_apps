import { useCallback } from 'react';
import { formatYen, parseNumber } from '@/lib/utils';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CurrencyInput({ value, onChange, placeholder = '0', className = '' }: CurrencyInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      if (raw === '') {
        onChange('');
        return;
      }
      onChange(formatYen(Number(raw)));
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    if (value === '') return;
    const num = parseNumber(value);
    onChange(num > 0 ? formatYen(num) : '');
  }, [value, onChange]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-right font-mono-num text-sm
        focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
    />
  );
}
