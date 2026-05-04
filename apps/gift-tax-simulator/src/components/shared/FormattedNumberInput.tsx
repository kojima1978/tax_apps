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
}: FormattedNumberInputProps) => (
    <div className="input-item">
        <label>{label}</label>
        <input
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

export default FormattedNumberInput;
