import { useState, useId, useEffect } from "react";
import InputWithUnit from "./InputWithUnit";
import FormField from "./FormField";
import { calcServiceYears } from "@/lib/retirement-tax";
import { parseIntInput } from "@/lib/utils";

const MODES = [
    { value: "direct", label: "直接入力" },
    { value: "date", label: "日付から計算" },
] as const;

type Mode = (typeof MODES)[number]["value"];

type ServiceYearsInputProps = {
    value: number;
    onChange: (years: number) => void;
};

const ServiceYearsInput = ({ value, onChange }: ServiceYearsInputProps) => {
    const [mode, setMode] = useState<Mode>("direct");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const yearsId = useId();
    const startId = useId();
    const endId = useId();

    const handleModeChange = (newMode: Mode) => {
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
                {MODES.map((m) => (
                    <button
                        key={m.value}
                        type="button"
                        className={`toggle-btn ${mode === m.value ? "active" : ""}`}
                        onClick={() => handleModeChange(m.value)}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {mode === "direct" ? (
                <FormField label="勤続年数" htmlFor={yearsId}>
                    <InputWithUnit
                        unit="年"
                        type="number"
                        id={yearsId}
                        min={1}
                        max={99}
                        value={value || ""}
                        onChange={(e) => onChange(parseIntInput(e.target.value))}
                        placeholder="例: 30"
                    />
                </FormField>
            ) : (
                <div className="date-inputs">
                    <FormField label="勤続開始日" htmlFor={startId}>
                        <input
                            type="date"
                            id={startId}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </FormField>
                    <FormField label="退職日" htmlFor={endId}>
                        <input
                            type="date"
                            id={endId}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </FormField>
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
