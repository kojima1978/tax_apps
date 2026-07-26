import { useId } from 'react';

type FormattedNumberInputProps = {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    hint?: string;
    hintClassName?: string;
    decimal?: boolean;
};

const FormattedNumberInput = ({
    label,
    value,
    onChange,
    placeholder,
    disabled,
    hint,
    hintClassName,
    decimal,
}: FormattedNumberInputProps) => {
    const inputId = useId();

    return (
    <div className="input-item">
        <label htmlFor={inputId}>{label}</label>
        <input
            id={inputId}
            type="text"
            inputMode={decimal ? 'decimal' : 'numeric'}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
        />
        {hint && <small className={hintClassName}>{hint}</small>}
    </div>
    );
};

export default FormattedNumberInput;
