import { type RetirementTaxResult, RETIREMENT_TYPE_LABELS, PATTERN_LABELS, calcEffectiveTaxRate } from "@/lib/retirement-tax";
import { TAX_RATES } from "@/lib/tax-rates";
import { formatYen } from "@/lib/utils";
import ReferenceTables from "./ReferenceTables";

type ResultSectionProps = {
    results: (RetirementTaxResult | null)[];
    isDirty: boolean;
};

type ComparisonRow = {
    label: string;
    values: (string | null)[];
    note?: string;
    highlight?: boolean;
};

const ResultSection = ({ results, isDirty }: ResultSectionProps) => {
    const activeResults = results.filter((r): r is RetirementTaxResult => r !== null);
    const activeIndices = results
        .map((r, i) => (r !== null ? i : -1))
        .filter((i) => i >= 0);

    if (activeResults.length === 0) {
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

    const first = activeResults[0];

    const yenValues = (getter: (r: RetirementTaxResult) => number) =>
        results.map((r) => (r ? formatYen(getter(r)) : null));

    const rows: ComparisonRow[] = [
        {
            label: "退職金支給額",
            values: yenValues((r) => r.amount),
        },
        {
            label: "退職所得控除額",
            values: yenValues((r) => r.deduction),
            note: first.isDisability ? "（障害者加算100万円含む）" : undefined,
        },
        {
            label: "課税退職所得金額",
            values: yenValues((r) => r.taxableIncome),
            note: "（1,000円未満切捨て）",
        },
        {
            label: "所得税額",
            values: yenValues((r) => r.incomeTax),
            note: "（100円未満切捨て）",
        },
        {
            label: "復興特別所得税額",
            values: yenValues((r) => r.reconstructionTax),
            note: "（所得税 × 2.1%）",
        },
        {
            label: "住民税額",
            values: yenValues((r) => r.residentTax),
            note: activeResults.length === 1
                ? `（市民税 ${formatYen(first.municipalTax)} + 県民税 ${formatYen(first.prefecturalTax)}）`
                : undefined,
        },
        {
            label: "税額合計",
            values: yenValues((r) => r.totalTax),
            highlight: true,
        },
        {
            label: "手取額",
            values: yenValues((r) => r.netAmount),
            highlight: true,
        },
        {
            label: "実効税率",
            values: results.map((r) =>
                r ? `${calcEffectiveTaxRate(r.amount, r.totalTax)}%` : null,
            ),
        },
    ];

    return (
        <div className="result-section">
            <h2 className="result-title">計算結果</h2>

            {isDirty && (
                <div className="dirty-notice">
                    入力が変更されました。「計算する」ボタンで再計算してください。
                </div>
            )}

            {/* 条件タグ */}
            <div className="result-conditions">
                <span className="condition-tag">{RETIREMENT_TYPE_LABELS[first.retirementType]}</span>
                <span className="condition-tag">勤続{first.serviceYears}年</span>
                <span className="condition-tag">{TAX_RATES[first.taxYear].label}</span>
                {first.isDisability && <span className="condition-tag disability">障害者退職</span>}
            </div>

            {/* サマリーカード（パターン別） */}
            <div className="summary-patterns">
                {activeIndices.map((i) => {
                    const r = results[i]!;
                    const rate = calcEffectiveTaxRate(r.amount, r.totalTax);
                    return (
                        <div key={i} className={`summary-pattern pattern-bg-${i}`}>
                            <span className="pattern-header">{PATTERN_LABELS[i]}</span>
                            <div className="pattern-summary-row">
                                <div className="pattern-summary-item">
                                    <span className="ps-label">手取額</span>
                                    <span className="ps-value">{formatYen(r.netAmount)}</span>
                                </div>
                                <div className="pattern-summary-item">
                                    <span className="ps-label">税額合計</span>
                                    <span className="ps-value">{formatYen(r.totalTax)}</span>
                                </div>
                                <div className="pattern-summary-item">
                                    <span className="ps-label">実効税率</span>
                                    <span className="ps-value">{rate}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 比較テーブル */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th className="label-col">項目</th>
                            {activeIndices.map((i) => (
                                <th key={i} className={`value-col pattern-th-${i}`}>
                                    {PATTERN_LABELS[i]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.label} className={row.highlight ? "highlight-row" : ""}>
                                <td>
                                    {row.label}
                                    {row.note && <small className="row-note">{row.note}</small>}
                                </td>
                                {activeIndices.map((i) => (
                                    <td key={i} className="value-cell">
                                        {row.values[i] ?? "—"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 参照表 */}
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
