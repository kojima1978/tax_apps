import { useId } from "react";
import FormField from "./FormField";
import InputWithUnit from "./InputWithUnit";
import { formatInputValue } from "@/lib/utils";

type CurrencyFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    disabled?: boolean;
};

/** 金額入力欄（カンマ区切り整形つき）。全タブで共通利用する */
const CurrencyField = ({ label, value, onChange, hint, disabled }: CurrencyFieldProps) => {
    const id = useId();

    return (
        <FormField label={label} htmlFor={id}>
            <InputWithUnit
                unit="円"
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(formatInputValue(e.target.value))}
            />
            {hint && <small>{hint}</small>}
        </FormField>
    );
};

export default CurrencyField;
