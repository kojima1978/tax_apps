import { useId } from "react";
import FormField from "@/components/FormField";
import BaseDepreciationForm, { type BaseDepreciationFormProps } from "@/components/BaseDepreciationForm";
import { INPUT_BASE } from "@/lib/styles";

type DepreciationFormProps = BaseDepreciationFormProps & {
    targetDate: string;
    onTargetDateChange: (val: string) => void;
};

const DepreciationForm = ({
    targetDate,
    onTargetDateChange,
    ...baseProps
}: DepreciationFormProps) => {
    const idPrefix = useId();

    return (
        <BaseDepreciationForm
            {...baseProps}
            carriedOverLabel="耐用年数計算から連携"
            extraFields={
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                    <FormField label="簿価算出基準日（任意）" htmlFor={`${idPrefix}-target`}>
                        <input
                            id={`${idPrefix}-target`}
                            type="date"
                            value={targetDate}
                            onChange={(e) => onTargetDateChange(e.target.value)}
                            className={INPUT_BASE}
                        />
                        <small className="block text-xs text-gray-500 mt-1">
                            指定日時点の残存簿価を算出します
                        </small>
                    </FormField>
                    <div />
                </div>
            }
        />
    );
};

export default DepreciationForm;
