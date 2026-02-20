import { useState, useId } from "react";
import InputWithUnit from "./InputWithUnit";
import FormField from "./FormField";
import ServiceYearsInput from "./ServiceYearsInput";
import OfficerLimitSection from "./OfficerLimitSection";
import CheckboxField from "./CheckboxField";
import { RETIREMENT_TYPES, RETIREMENT_TYPE_LABELS, PATTERN_LABELS, type RetirementType } from "@/lib/retirement-tax";
import { TAX_RATES, AVAILABLE_YEARS } from "@/lib/tax-rates";
import { parseFormattedNumber } from "@/lib/utils";

type RetirementFormProps = {
    amounts: string[];
    onAmountChange: (index: number, val: string) => void;
    onApplyLimit: (amount: number, index: number) => void;
    serviceYears: number;
    onServiceYearsChange: (years: number) => void;
    retirementType: RetirementType;
    onRetirementTypeChange: (type: RetirementType) => void;
    isDisability: boolean;
    onDisabilityChange: (val: boolean) => void;
    taxYear: string;
    onTaxYearChange: (year: string) => void;
    canCalculate: boolean;
    onCalculate: () => void;
};

const RetirementForm = ({
    amounts,
    onAmountChange,
    onApplyLimit,
    serviceYears,
    onServiceYearsChange,
    retirementType,
    onRetirementTypeChange,
    isDisability,
    onDisabilityChange,
    taxYear,
    onTaxYearChange,
    canCalculate,
    onCalculate,
}: RetirementFormProps) => {
    const [isOfficer, setIsOfficer] = useState(false);
    const yearId = useId();

    const retirementAmountA = parseFormattedNumber(amounts[0]);
    const showOfficer = retirementType !== "short_term";

    return (
        <div className="form-section">
            {/* 退職金額（3パターン横並び） */}
            <FormField label="退職金支給額">
                <div className="pattern-inputs">
                    {PATTERN_LABELS.map((label, i) => (
                        <div key={label} className="pattern-input-item">
                            <span className={`pattern-label pattern-${i}`}>{label}</span>
                            <InputWithUnit
                                unit="円"
                                type="text"
                                value={amounts[i]}
                                onChange={(e) => onAmountChange(i, e.target.value)}
                                placeholder={i === 0 ? "例: 20,000,000" : ""}
                                inputMode="numeric"
                            />
                        </div>
                    ))}
                </div>
            </FormField>

            {/* 役員退職金チェック（短期退職手当等以外で表示） — 支給額の直下 */}
            {showOfficer && (
                <CheckboxField
                    checked={isOfficer}
                    onChange={setIsOfficer}
                    label="役員退職金である"
                    description="限度額（最終月額報酬 × 功績倍率 × 勤続年数）を計算します"
                />
            )}

            {/* 役員限度額セクション */}
            {isOfficer && showOfficer && (
                <OfficerLimitSection
                    serviceYears={serviceYears}
                    onServiceYearsChange={onServiceYearsChange}
                    retirementAmount={retirementAmountA}
                    onApplyToAmount={onApplyLimit}
                />
            )}

            {/* 条件設定（2列グリッド） */}
            <div className="form-row">
                {/* 退職区分 */}
                <FormField label="退職区分">
                    <div className="radio-group">
                        {RETIREMENT_TYPES.map((type) => (
                            <label key={type} className="radio-label">
                                <input
                                    type="radio"
                                    name="retirementType"
                                    value={type}
                                    checked={retirementType === type}
                                    onChange={() => onRetirementTypeChange(type)}
                                />
                                <span>{RETIREMENT_TYPE_LABELS[type]}</span>
                            </label>
                        ))}
                    </div>
                </FormField>

                {/* 勤続年数 */}
                <ServiceYearsInput value={serviceYears} onChange={onServiceYearsChange} />

                {/* 障害者退職 */}
                <CheckboxField
                    checked={isDisability}
                    onChange={onDisabilityChange}
                    label="障害者になったことに直接基因して退職した"
                    description="控除額に100万円が加算されます"
                />

                {/* 税率年度 */}
                <FormField label="適用税率年度" htmlFor={yearId}>
                    <select
                        id={yearId}
                        value={taxYear}
                        onChange={(e) => onTaxYearChange(e.target.value)}
                    >
                        {AVAILABLE_YEARS.map((year) => (
                            <option key={year} value={year}>
                                {TAX_RATES[year].label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            {/* 計算ボタン */}
            <button
                type="button"
                className="btn-calc"
                disabled={!canCalculate}
                onClick={onCalculate}
            >
                計算する
            </button>
        </div>
    );
};

export default RetirementForm;
