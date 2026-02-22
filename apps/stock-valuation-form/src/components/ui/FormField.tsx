interface FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  textAlign?: 'left' | 'center' | 'right';
  unit?: string;
}

export function FormField({
  value,
  onChange,
  className = '',
  placeholder,
  textAlign = 'left',
  unit,
}: FormFieldProps) {
  const alignClass =
    textAlign === 'right'
      ? 'text-right'
      : textAlign === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <span className={`inline-flex items-center ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`gov-input ${alignClass}`}
        placeholder={placeholder}
      />
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );
}
