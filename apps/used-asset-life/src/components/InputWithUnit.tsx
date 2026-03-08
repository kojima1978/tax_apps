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
        <div className="flex items-center gap-2">
            <input
                {...inputProps}
                onFocus={handleFocus}
                className={`flex-1 p-3 border border-gray-300 rounded text-base text-right font-mono-num focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 w-full ${inputProps.className ?? ''}`}
            />
            <span className="font-semibold text-gray-600 whitespace-nowrap text-sm">{unit}</span>
        </div>
    );
};

export default InputWithUnit;
