import { useId } from "react";
import FormField from "./FormField";
import InputWithUnit from "./InputWithUnit";
import { formatInputValue } from "@/lib/utils";

/** 入力欄に値を流し込む補助ボタン（自動計算など）。押した後は手で上書きできる */
export type FieldAction = {
    label: string;
    onClick: () => void;
    /** 計算元が未入力のときなど、押させない場合に true */
    disabled?: boolean;
    /** disabled の理由や計算式の説明 */
    title?: string;
};

type CurrencyFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    disabled?: boolean;
    action?: FieldAction;
};

/** 金額入力欄（カンマ区切り整形つき）。全タブで共通利用する */
const CurrencyField = ({ label, value, onChange, hint, disabled, action }: CurrencyFieldProps) => {
    const id = useId();

    return (
        <FormField
            label={label}
            htmlFor={id}
            labelAction={
                action && (
                    <button
                        type="button"
                        className="field-action"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        title={action.title}
                    >
                        {action.label}
                    </button>
                )
            }
        >
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
