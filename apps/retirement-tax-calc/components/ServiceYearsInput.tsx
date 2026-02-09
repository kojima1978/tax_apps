"use client";

import { useState, useId, useEffect } from "react";
import { calcServiceYears } from "@/lib/retirement-tax";
import { parseIntInput } from "@/lib/utils";

type ServiceYearsInputProps = {
    value: number;
    onChange: (years: number) => void;
};

const ServiceYearsInput = ({ value, onChange }: ServiceYearsInputProps) => {
    const [mode, setMode] = useState<"direct" | "date">("direct");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const yearsId = useId();
    const startId = useId();
    const endId = useId();

    const handleModeChange = (newMode: "direct" | "date") => {
        setMode(newMode);
        if (newMode === "direct") {
            setStartDate("");
            setEndDate("");
        }
    };

    // 日付モード時、両方の日付が入力されたら自動計算
    useEffect(() => {
        if (mode === "date" && startDate && endDate) {
            const years = calcServiceYears(startDate, endDate);
            if (years > 0) {
                onChange(years);
            }
        }
    }, [mode, startDate, endDate, onChange]);

    return (
        <div className="service-years-section">
            <div className="mode-toggle">
                <button
                    type="button"
                    className={`toggle-btn ${mode === "direct" ? "active" : ""}`}
                    onClick={() => handleModeChange("direct")}
                >
                    直接入力
                </button>
                <button
                    type="button"
                    className={`toggle-btn ${mode === "date" ? "active" : ""}`}
                    onClick={() => handleModeChange("date")}
                >
                    日付から計算
                </button>
            </div>

            {mode === "direct" ? (
                <div className="input-item">
                    <label htmlFor={yearsId}>勤続年数</label>
                    <div className="input-with-unit">
                        <input
                            type="number"
                            id={yearsId}
                            min={1}
                            max={99}
                            value={value || ""}
                            onChange={(e) => onChange(parseIntInput(e.target.value))}
                            placeholder="例: 30"
                        />
                        <span className="unit">年</span>
                    </div>
                </div>
            ) : (
                <div className="date-inputs">
                    <div className="input-item">
                        <label htmlFor={startId}>勤続開始日</label>
                        <input
                            type="date"
                            id={startId}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="input-item">
                        <label htmlFor={endId}>退職日</label>
                        <input
                            type="date"
                            id={endId}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    {startDate && endDate && value > 0 && (
                        <p className="calc-result-note">
                            → 勤続年数: <strong>{value}年</strong>（1年未満切上げ）
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServiceYearsInput;
