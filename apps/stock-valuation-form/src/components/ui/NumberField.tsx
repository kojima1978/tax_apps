interface NumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  unit?: string;
  placeholder?: string;
}

export function NumberField({
  value,
  onChange,
  className = '',
  unit,
  placeholder,
}: NumberFieldProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="gov-input gov-input-number"
        placeholder={placeholder}
      />
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );
}
