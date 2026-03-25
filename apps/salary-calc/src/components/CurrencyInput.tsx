import { useCallback, useRef } from 'react';

interface CurrencyInputProps {
  id?: string;
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

export function CurrencyInput({ id, value, onChange, placeholder, required }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const prevLen = el.value.length;
    const prevCursor = el.selectionStart ?? prevLen;

    const raw = stripCommas(el.value);
    onChange(raw);

    // カンマ挿入によるカーソルずれを補正
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const formatted = formatWithCommas(raw);
      const diff = formatted.length - prevLen;
      const cursor = Math.max(0, prevCursor + diff);
      inputRef.current.setSelectionRange(cursor, cursor);
    });
  }, [onChange]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">¥</span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={formatWithCommas(value)}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg transition"
      />
    </div>
  );
}
