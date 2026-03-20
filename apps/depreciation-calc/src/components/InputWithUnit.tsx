import { type InputHTMLAttributes } from "react";
import { INPUT_BASE } from "@/lib/styles";

type InputWithUnitProps = InputHTMLAttributes<HTMLInputElement> & {
    unit: string;
};

const InputWithUnit = ({ unit, onFocus, ...inputProps }: InputWithUnitProps) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
        onFocus?.(e);
    };

    return (
        <div className="flex items-center gap-2">
            <input
                {...inputProps}
                onFocus={handleFocus}
                className={`flex-1 ${INPUT_BASE} text-right font-mono-num ${inputProps.className ?? ''}`}
            />
            <span className="font-semibold text-gray-600 whitespace-nowrap text-sm">{unit}</span>
        </div>
    );
};

export default InputWithUnit;
