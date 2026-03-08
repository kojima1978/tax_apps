import { useId } from "react";
import FormField from "@/components/FormField";
import InputWithUnit from "@/components/InputWithUnit";
import BaseDepreciationForm, { type BaseDepreciationFormProps } from "@/components/BaseDepreciationForm";

type PeriodDepFormProps = BaseDepreciationFormProps & {
    startYear: string;
    displayYears: string;
    onStartYearChange: (val: string) => void;
    onDisplayYearsChange: (val: string) => void;
};

const PeriodDepForm = ({
    startYear,
    displayYears,
    onStartYearChange,
    onDisplayYearsChange,
    ...baseProps
}: PeriodDepFormProps) => {
    const idPrefix = useId();

    return (
        <BaseDepreciationForm
            {...baseProps}
            carriedOverLabel="簿価計算から連携"
            extraFields={
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-6">
                    <FormField label="開始年度（任意）" htmlFor={`${idPrefix}-start-year`}>
                        <InputWithUnit
                            id={`${idPrefix}-start-year`}
                            type="number"
                            unit="年"
                            value={startYear}
                            onChange={(e) => onStartYearChange(e.target.value)}
                            placeholder="例: 2024"
                            min="1900"
                            max="2100"
                        />
                        <small className="block text-xs text-gray-500 mt-1">
                            指定年度から表示（未入力時は初年度から）
                        </small>
                    </FormField>

                    <FormField label="表示年数" htmlFor={`${idPrefix}-display-years`}>
                        <InputWithUnit
                            id={`${idPrefix}-display-years`}
                            type="number"
                            unit="年間"
                            value={displayYears}
                            onChange={(e) => onDisplayYearsChange(e.target.value)}
                            placeholder="例: 5"
                            min="1"
                            max="100"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {[3, 5, 10, 20].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => onDisplayYearsChange(String(n))}
                                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                                        displayYears === String(n)
                                            ? 'bg-green-700 text-white border-green-700'
                                            : 'bg-white text-green-800 border-green-300 hover:bg-green-50 hover:border-green-500'
                                    }`}
                                >
                                    {n}年
                                </button>
                            ))}
                        </div>
                    </FormField>
                </div>
            }
        />
    );
};

export default PeriodDepForm;
