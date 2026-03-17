import { PATTERN_LABELS } from "@/lib/retirement-tax";
import { formatYen } from "@/lib/utils";

type LimitResultDisplayProps = {
    limit: number;
    monthlyComp: number;
    multiplier: string;
    serviceYears: number;
    retirementAmount: number;
    isOverLimit: boolean;
    onApplyToAmount: (amount: number, index: number) => void;
};

const LimitResultDisplay = ({ limit, monthlyComp, multiplier, serviceYears, retirementAmount, isOverLimit, onApplyToAmount }: LimitResultDisplayProps) => (
    <div className="limit-result">
        <div className="limit-formula">
            {formatYen(monthlyComp)} × {multiplier} × {serviceYears}年
        </div>
        <div className="limit-value-row">
            <div className="limit-value">
                限度額: <strong>{formatYen(limit)}</strong>
            </div>
            <div className="limit-apply-buttons">
                {PATTERN_LABELS.map((label, i) => (
                    <button
                        key={label}
                        type="button"
                        className={`btn-apply-limit pattern-apply-${i}`}
                        onClick={() => onApplyToAmount(limit, i)}
                    >
                        {label}に反映
                    </button>
                ))}
            </div>
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
);

export default LimitResultDisplay;
