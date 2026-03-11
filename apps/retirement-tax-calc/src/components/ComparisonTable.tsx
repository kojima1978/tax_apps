import { type RetirementTaxResult, PATTERN_LABELS, calcEffectiveTaxRate } from "@/lib/retirement-tax";
import { formatYen } from "@/lib/utils";

type ComparisonRow = {
    label: string;
    values: (string | null)[];
    note?: string;
    highlight?: boolean;
};

const buildRows = (results: (RetirementTaxResult | null)[]): ComparisonRow[] => {
    const activeResults = results.filter((r): r is RetirementTaxResult => r !== null);
    const first = activeResults[0];

    const yenValues = (getter: (r: RetirementTaxResult) => number) =>
        results.map((r) => (r ? formatYen(getter(r)) : null));

    return [
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
};

type ComparisonTableProps = {
    results: (RetirementTaxResult | null)[];
    activeIndices: number[];
};

const ComparisonTable = ({ results, activeIndices }: ComparisonTableProps) => {
    const rows = buildRows(results);

    return (
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
    );
};

export default ComparisonTable;
