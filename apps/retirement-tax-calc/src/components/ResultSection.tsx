import { type RetirementTaxResult, RETIREMENT_TYPE_LABELS } from "@/lib/retirement-tax";
import { TAX_RATES } from "@/lib/tax-rates";
import SummaryPatterns from "./SummaryPatterns";
import ComparisonTable from "./ComparisonTable";
import ReferenceTables from "./ReferenceTables";

type ResultSectionProps = {
    results: (RetirementTaxResult | null)[];
    isDirty: boolean;
};

type TagDef = {
    label: (r: RetirementTaxResult) => string;
    className?: string;
    show?: (r: RetirementTaxResult) => boolean;
};

const TAG_DEFS: TagDef[] = [
    { label: (r) => RETIREMENT_TYPE_LABELS[r.retirementType] },
    { label: (r) => `勤続${r.serviceYears}年` },
    { label: (r) => TAX_RATES[r.taxYear].label },
    { label: () => "障害者退職", className: "disability", show: (r) => r.isDisability },
];

const buildConditionTags = (r: RetirementTaxResult) =>
    TAG_DEFS.filter((d) => !d.show || d.show(r)).map((d) => ({ label: d.label(r), className: d.className }));

const ResultSection = ({ results, isDirty }: ResultSectionProps) => {
    const activeIndices = results.reduce<number[]>(
        (acc, r, i) => (r !== null ? [...acc, i] : acc), [],
    );

    if (activeIndices.length === 0) {
        return (
            <div className="result-section result-empty">
                <div className="empty-state">
                    <p className="empty-icon">📊</p>
                    <p>退職金額と勤続年数を入力し</p>
                    <p>「計算する」ボタンを押してください</p>
                    <p className="empty-sub">最大3パターンの比較ができます</p>
                </div>
            </div>
        );
    }

    const first = results[activeIndices[0]]!;
    const conditionTags = buildConditionTags(first);

    return (
        <div className="result-section">
            <h2 className="result-title">計算結果</h2>

            {isDirty && (
                <div className="dirty-notice">
                    入力が変更されました。「計算する」ボタンで再計算してください。
                </div>
            )}

            <div className="result-conditions">
                {conditionTags.map((tag) => (
                    <span key={tag.label} className={`condition-tag ${tag.className ?? ""}`}>
                        {tag.label}
                    </span>
                ))}
            </div>

            <SummaryPatterns results={results} activeIndices={activeIndices} />
            <ComparisonTable results={results} activeIndices={activeIndices} />

            <ReferenceTables
                serviceYears={first.serviceYears}
                taxableIncome={first.taxableIncome}
                taxYear={first.taxYear}
            />

            <p className="disclaimer">
                ※ 本シミュレーションは概算です。実際の税額とは異なる場合があります。
            </p>
        </div>
    );
};

export default ResultSection;
