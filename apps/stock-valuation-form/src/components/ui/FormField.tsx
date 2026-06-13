import { useId } from 'react';

interface FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  textAlign?: 'left' | 'center' | 'right';
  unit?: string;
  ariaLabel?: string;
  id?: string;
  name?: string;
}

export function FormField({
  value,
  onChange,
  className = '',
  placeholder,
  textAlign = 'left',
  unit,
  ariaLabel,
  id,
  name,
}: FormFieldProps) {
  const generatedId = `form-field-${useId().replace(/:/g, '')}`;
  const inputId = id ?? generatedId;
  const alignClass =
    textAlign === 'right'
      ? 'text-right'
      : textAlign === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <span className={`flex items-center ${className || 'w-full'}`}>
      <input
        id={inputId}
        name={name ?? inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`gov-input ${alignClass}`}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
      />
      {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
    </span>
  );
}
