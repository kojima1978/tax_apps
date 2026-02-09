"use client";

import { useState, useMemo, useId } from "react";
import { OFFICER_PRESETS, calcOfficerLimit } from "@/lib/retirement-tax";
import { formatYen, formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";

type OfficerLimitSectionProps = {
    serviceYears: number;
    onServiceYearsChange: (years: number) => void;
    retirementAmount: number;
    onApplyToAmount: (amount: number) => void;
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

    const limit = useMemo(() => {
        const comp = parseFormattedNumber(monthlyComp);
        const mult = parseFloat(multiplier) || 0;
        if (comp <= 0 || mult <= 0 || serviceYears <= 0) return 0;
        return calcOfficerLimit(comp, mult, serviceYears);
    }, [monthlyComp, multiplier, serviceYears]);

    const isOverLimit = retirementAmount > 0 && limit > 0 && retirementAmount > limit;

    return (
        <div className="officer-limit-section">
            <h3 className="section-subtitle">役員退職金限度額</h3>

            <div className="officer-inputs">
                <div className="input-item">
                    <label htmlFor={compId}>最終月額報酬</label>
                    <div className="input-with-unit">
                        <input
                            type="text"
                            id={compId}
                            value={monthlyComp}
                            onChange={(e) => setMonthlyComp(formatInputValue(e.target.value))}
                            placeholder="例: 1,000,000"
                            inputMode="numeric"
                        />
                        <span className="unit">円</span>
                    </div>
                </div>

                <div className="input-item">
                    <label>役職プリセット</label>
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
                </div>

                <div className="officer-inputs-row">
                    <div className="input-item">
                        <label htmlFor={multId}>功績倍率</label>
                        <input
                            type="number"
                            id={multId}
                            step="0.1"
                            min="0.1"
                            max="10"
                            value={multiplier}
                            onChange={(e) => setMultiplier(e.target.value)}
                        />
                    </div>
                    <div className="input-item">
                        <label htmlFor={yearsId}>勤続年数</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                id={yearsId}
                                min="1"
                                max="100"
                                value={serviceYears || ""}
                                onChange={(e) => onServiceYearsChange(parseIntInput(e.target.value))}
                            />
                            <span className="unit">年</span>
                        </div>
                    </div>
                </div>
            </div>

            {limit > 0 && (
                <div className="limit-result">
                    <div className="limit-formula">
                        {formatYen(parseFormattedNumber(monthlyComp))} × {multiplier} × {serviceYears}年
                    </div>
                    <div className="limit-value-row">
                        <div className="limit-value">
                            限度額: <strong>{formatYen(limit)}</strong>
                        </div>
                        <button
                            type="button"
                            className="btn-apply-limit"
                            onClick={() => onApplyToAmount(limit)}
                        >
                            案①に反映
                        </button>
                    </div>

                    {isOverLimit && (
                        <div className="limit-warning">
                            <span className="warning-icon">⚠</span>
                            <div>
                                <p className="warning-title">限度額を超過しています</p>
                                <p className="warning-detail">
                                    支給額 {formatYen(retirementAmount)} − 限度額 {formatYen(limit)} ={" "}
                                    <strong>超過額 {formatYen(retirementAmount - limit)}</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {!isOverLimit && retirementAmount > 0 && (
                        <div className="limit-ok">
                            支給額は限度額の範囲内です
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfficerLimitSection;
