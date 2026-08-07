import { type InputHTMLAttributes } from "react";

type InputWithUnitProps = InputHTMLAttributes<HTMLInputElement> & {
    unit: string;
};

const InputWithUnit = ({ unit, onFocus, ...inputProps }: InputWithUnitProps) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        onFocus?.(e);
    };

    return (
        <div className="input-with-unit">
            <input {...inputProps} onFocus={handleFocus} />
            <span className="unit">{unit}</span>
        </div>
    );
};

export default InputWithUnit;
