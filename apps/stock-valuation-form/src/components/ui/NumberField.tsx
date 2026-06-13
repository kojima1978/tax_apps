import { useId } from 'react';

interface NumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  unit?: string;
  placeholder?: string;
  ariaLabel?: string;
  allowNegative?: boolean;
  id?: string;
  name?: string;
}

function addCommas(v: string): string {
  if (!v || v === '-') return v;
  const neg = v.startsWith('-');
  const abs = neg ? v.slice(1) : v;
  const num = Number(abs);
  if (isNaN(num)) return v;
  return (neg ? '-' : '') + num.toLocaleString();
}

export function NumberField({
  value,
  onChange,
  className = '',
  unit,
  placeholder,
  ariaLabel,
  allowNegative = false,
  id,
  name,
}: NumberFieldProps) {
  const generatedId = `number-field-${useId().replace(/:/g, '')}`;
  const inputId = id ?? generatedId;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || raw === '-') {
      onChange(raw);
      return;
    }
    const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
    if (pattern.test(raw)) {
      onChange(raw);
    }
  };

  return (
    <span className={`flex items-center ${className || 'w-full'}`}>
      <input
        id={inputId}
        name={name ?? inputId}
        type="text"
        inputMode="numeric"
        value={addCommas(value)}
        onChange={handleChange}
        className="gov-input gov-input-number"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
      />
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );
}
