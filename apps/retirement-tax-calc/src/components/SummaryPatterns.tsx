import { type RetirementTaxResult, PATTERN_LABELS, calcEffectiveTaxRate } from "@/lib/retirement-tax";
import { formatYen } from "@/lib/utils";

const SUMMARY_ITEMS: { label: string; getValue: (r: RetirementTaxResult) => string }[] = [
    { label: "手取額", getValue: (r) => formatYen(r.netAmount) },
    { label: "税額合計", getValue: (r) => formatYen(r.totalTax) },
    { label: "実効税率", getValue: (r) => `${calcEffectiveTaxRate(r.amount, r.totalTax)}%` },
];

type SummaryPatternsProps = {
    results: (RetirementTaxResult | null)[];
    activeIndices: number[];
};

const SummaryPatterns = ({ results, activeIndices }: SummaryPatternsProps) => (
    <div className="summary-patterns">
        {activeIndices.map((i) => {
            const r = results[i]!;
            return (
                <div key={i} className={`summary-pattern pattern-bg-${i}`}>
                    <span className="pattern-header">{PATTERN_LABELS[i]}</span>
                    <div className="pattern-summary-row">
                        {SUMMARY_ITEMS.map((item) => (
                            <div key={item.label} className="pattern-summary-item">
                                <span className="ps-label">{item.label}</span>
                                <span className="ps-value">{item.getValue(r)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
);

export default SummaryPatterns;
