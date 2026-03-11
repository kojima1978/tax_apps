import { useState, useCallback, useRef } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function formatWithCommas(val: string): string {
  const num = val.replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('ja-JP');
}

function stripCommas(val: string): string {
  return val.replace(/[^\d]/g, '');
}

export function CurrencyInput({ value, onChange, placeholder, required }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatWithCommas(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setDisplayValue(value);
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setDisplayValue(formatWithCommas(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = stripCommas(e.target.value);
    onChange(raw);
    if (isFocused) {
      setDisplayValue(raw);
    }
  }, [onChange, isFocused]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={isFocused ? displayValue : formatWithCommas(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
      />
    </div>
  );
}
