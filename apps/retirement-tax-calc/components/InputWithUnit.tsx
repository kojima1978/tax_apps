import { type InputHTMLAttributes } from "react";

type InputWithUnitProps = InputHTMLAttributes<HTMLInputElement> & {
    unit: string;
};

const InputWithUnit = ({ unit, ...inputProps }: InputWithUnitProps) => (
    <div className="input-with-unit">
        <input {...inputProps} />
        <span className="unit">{unit}</span>
    </div>
);

export default InputWithUnit;
