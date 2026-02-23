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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // 空文字か0以上の整数のみ許可
    if (v === '' || /^\d+$/.test(v)) {
      onChange(v);
    }
  };

  return (
    <span className={`flex items-center w-full ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        className="gov-input gov-input-number"
        placeholder={placeholder}
      />
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );
}
