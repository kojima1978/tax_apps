import { useState, useMemo, useId } from "react";
import InputWithUnit from "./InputWithUnit";
import FormField from "./FormField";
import LimitResultDisplay from "./LimitResultDisplay";
import { OFFICER_PRESETS, calcOfficerLimit } from "@/lib/retirement-tax";
import { formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";

type OfficerLimitSectionProps = {
    serviceYears: number;
    onServiceYearsChange: (years: number) => void;
    retirementAmount: number;
    onApplyToAmount: (amount: number, index: number) => void;
};

const OfficerLimitSection = ({ serviceYears, onServiceYearsChange, retirementAmount, onApplyToAmount }: OfficerLimitSectionProps) => {
    const [monthlyComp, setMonthlyComp] = useState("");
    const [multiplier, setMultiplier] = useState("3.0");
    const [selectedPreset, setSelectedPreset] = useState("社長");
    const compId = useId();
    const multId = useId();
    const yearsId = useId();

    const handlePresetChange = (presetLabel: string) => {
        setSelectedPreset(presetLabel);
        const preset = OFFICER_PRESETS.find((p) => p.label === presetLabel);
        if (preset) {
            setMultiplier(String(preset.multiplier));
        }
    };

    const parsedComp = parseFormattedNumber(monthlyComp);

    const limit = useMemo(() => {
        const mult = parseFloat(multiplier) || 0;
        if (parsedComp <= 0 || mult <= 0 || serviceYears <= 0) return 0;
        return calcOfficerLimit(parsedComp, mult, serviceYears);
    }, [parsedComp, multiplier, serviceYears]);

    const isOverLimit = retirementAmount > 0 && limit > 0 && retirementAmount > limit;

    return (
        <div className="officer-limit-section">
            <h3 className="section-subtitle">役員退職金限度額</h3>

            <div className="officer-inputs">
                <FormField label="最終月額報酬" htmlFor={compId}>
                    <InputWithUnit
                        unit="円"
                        type="text"
                        id={compId}
                        value={monthlyComp}
                        onChange={(e) => setMonthlyComp(formatInputValue(e.target.value))}
                        placeholder="例: 1,000,000"
                        inputMode="numeric"
                    />
                </FormField>

                <FormField label="役職プリセット">
                    <div className="preset-buttons">
                        {OFFICER_PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                className={`toggle-btn small ${selectedPreset === p.label ? "active" : ""}`}
                                onClick={() => handlePresetChange(p.label)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </FormField>

                <div className="officer-inputs-row">
                    <FormField label="功績倍率" htmlFor={multId}>
                        <input
                            type="number"
                            id={multId}
                            step="0.1"
                            min="0.1"
                            max="10"
                            value={multiplier}
                            onChange={(e) => setMultiplier(e.target.value)}
                        />
                    </FormField>
                    <FormField label="勤続年数" htmlFor={yearsId}>
                        <InputWithUnit
                            unit="年"
                            type="number"
                            id={yearsId}
                            min="1"
                            max="100"
                            value={serviceYears || ""}
                            onChange={(e) => onServiceYearsChange(parseIntInput(e.target.value))}
                        />
                    </FormField>
                </div>
            </div>

            {limit > 0 && (
                <LimitResultDisplay
                    limit={limit}
                    monthlyComp={parsedComp}
                    multiplier={multiplier}
                    serviceYears={serviceYears}
                    retirementAmount={retirementAmount}
                    isOverLimit={isOverLimit}
                    onApplyToAmount={onApplyToAmount}
                />
            )}
        </div>
    );
};

export default OfficerLimitSection;
