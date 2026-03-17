import { type RetirementTaxResult, PATTERN_LABELS, calcEffectiveTaxRate } from "@/lib/retirement-tax";
import { formatYen } from "@/lib/utils";

type RowDef = {
    label: string;
    format: (r: RetirementTaxResult) => string;
    note?: (first: RetirementTaxResult, activeCount: number) => string | undefined;
    highlight?: boolean;
};

const TABLE_ROW_DEFS: RowDef[] = [
    { label: "退職金支給額", format: (r) => formatYen(r.amount) },
    { label: "退職所得控除額", format: (r) => formatYen(r.deduction), note: (first) => first.isDisability ? "（障害者加算100万円含む）" : undefined },
    { label: "課税退職所得金額", format: (r) => formatYen(r.taxableIncome), note: () => "（1,000円未満切捨て）" },
    { label: "所得税額", format: (r) => formatYen(r.incomeTax), note: () => "（100円未満切捨て）" },
    { label: "復興特別所得税額", format: (r) => formatYen(r.reconstructionTax), note: () => "（所得税 × 2.1%）" },
    { label: "住民税額", format: (r) => formatYen(r.residentTax), note: (first, n) => n === 1 ? `（市民税 ${formatYen(first.municipalTax)} + 県民税 ${formatYen(first.prefecturalTax)}）` : undefined },
    { label: "税額合計", format: (r) => formatYen(r.totalTax), highlight: true },
    { label: "手取額", format: (r) => formatYen(r.netAmount), highlight: true },
    { label: "実効税率", format: (r) => `${calcEffectiveTaxRate(r.amount, r.totalTax)}%` },
];

type ComparisonRow = {
    label: string;
    values: (string | null)[];
    note?: string;
    highlight?: boolean;
};

const buildRows = (results: (RetirementTaxResult | null)[]): ComparisonRow[] => {
    const activeCount = results.filter((r) => r !== null).length;
    const first = results.find((r): r is RetirementTaxResult => r !== null)!;

    return TABLE_ROW_DEFS.map((def) => ({
        label: def.label,
        values: results.map((r) => (r ? def.format(r) : null)),
        note: def.note?.(first, activeCount),
        highlight: def.highlight,
    }));
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
