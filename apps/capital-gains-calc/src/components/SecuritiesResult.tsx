import { useMemo } from "react";
import NoteList from "./NoteList";
import ResultTable from "./ResultTable";
import type { SecuritiesResult as SecuritiesResultType } from "@/lib/capital-gains";
import { netProceedsRows, taxTotalRows, type ResultRow } from "@/lib/result-rows";
import type { SecuritiesFormState } from "@/hooks/useSecuritiesForm";
import { formatYen, parseFormattedNumber } from "@/lib/utils";

type SecuritiesResultProps = {
    form: SecuritiesFormState;
    result: SecuritiesResultType;
};

const SecuritiesResultView = ({ form, result }: SecuritiesResultProps) => {
    const transferPrice = parseFormattedNumber(form.transferPrice);

    const incomeRows = useMemo<ResultRow[]>(
        () => [
            { label: "譲渡価額", value: formatYen(transferPrice) },
            {
                label: form.costMode === "actual" ? "取得費（実額）" : "取得費（概算・譲渡価額の5%）",
                value: formatYen(result.acquisitionCost),
            },
            { label: "譲渡費用", value: formatYen(result.transferExpense) },
            { label: "譲渡所得金額", value: formatYen(result.grossProfit), highlight: true },
            { label: "課税譲渡所得金額", value: formatYen(result.taxableIncome), highlight: true },
        ],
        [form.costMode, result, transferPrice],
    );

    const taxRows = useMemo<ResultRow[]>(
        () => [
            ...taxTotalRows(result.tax, result.rate),
            {
                label: "税額合計",
                value: formatYen(result.tax.total),
                note: `合計税率 ${result.ratePercent}%`,
                highlight: true,
            },
            ...netProceedsRows({
                transferPrice,
                transferExpense: result.transferExpense,
                tax: result.tax.total,
                netProceeds: result.netProceeds,
            }),
        ],
        [result, transferPrice],
    );

    return (
        <section className="result-section">
            <h2>計算結果（{form.listed ? "上場株式等" : "一般株式等"}の譲渡）</h2>
            <div className="result-grid">
                <ResultTable caption="譲渡所得の計算" rows={incomeRows} />
                <ResultTable caption="税額の計算" rows={taxRows} />
            </div>
            <NoteList notes={result.notes} />
        </section>
    );
};

export default SecuritiesResultView;
