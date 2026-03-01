interface NumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  unit?: string;
  placeholder?: string;
}

function addCommas(v: string): string {
  if (!v) return '';
  return Number(v).toLocaleString();
}

export function NumberField({
  value,
  onChange,
  className = '',
  unit,
  placeholder,
}: NumberFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // カンマを除去して数字のみ許可
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      onChange(raw);
    }
  };

  return (
    <span className={`flex items-center ${className || 'w-full'}`}>
      <input
        type="text"
        inputMode="numeric"
        value={addCommas(value)}
        onChange={handleChange}
        className="gov-input gov-input-number"
        placeholder={placeholder}
      />
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );
}
