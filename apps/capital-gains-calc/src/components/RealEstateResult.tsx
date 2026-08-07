import { useMemo } from "react";
import NoteList from "./NoteList";
import ResultTable, { type ResultRow } from "./ResultTable";
import type { RealEstateResult as RealEstateResultType } from "@/lib/capital-gains";
import { formatYen, parseFormattedNumber } from "@/lib/utils";
import type { RealEstateFormState } from "@/hooks/useRealEstateForm";

type RealEstateResultProps = {
    form: RealEstateFormState;
    result: RealEstateResultType;
};

const RealEstateResultView = ({ form, result }: RealEstateResultProps) => {
    const transferPrice = parseFormattedNumber(form.transferPrice);

    const incomeRows = useMemo<ResultRow[]>(() => {
        const rows: ResultRow[] = [{ label: "譲渡価額", value: formatYen(transferPrice) }];

        if (form.costMode === "actual") {
            rows.push(
                { label: "取得費（実額）", value: formatYen(result.actualCost) },
                { label: "土地の取得価額", value: formatYen(parseFormattedNumber(form.landCost)), sub: true },
                { label: "建物の取得価額", value: formatYen(parseFormattedNumber(form.buildingCost)), sub: true },
                { label: "償却費相当額", value: `− ${formatYen(result.depreciation)}`, sub: true },
            );
        } else {
            rows.push({
                label: "取得費（概算・譲渡価額の5%）",
                value: formatYen(result.estimatedCost),
            });
        }

        if (result.costAddition > 0) {
            rows.push({ label: "取得費加算額（相続税額）", value: formatYen(result.costAddition), sub: true });
        }

        rows.push(
            { label: "譲渡費用", value: formatYen(result.transferExpense) },
            { label: "譲渡所得金額", value: formatYen(result.grossProfit), highlight: true },
        );

        if (result.specialDeduction > 0) {
            rows.push({ label: "特別控除（居住用財産 3,000万円）", value: `− ${formatYen(result.specialDeduction)}` });
        }

        rows.push({ label: "課税譲渡所得金額", value: formatYen(result.taxableIncome), highlight: true });
        return rows;
    }, [form, result, transferPrice]);

    const taxRows = useMemo<ResultRow[]>(() => {
        const rows: ResultRow[] = [];

        result.brackets.forEach((bracket) => {
            rows.push({
                label: bracket.label,
                value: formatYen(bracket.taxableAmount),
                note: `税率 ${bracket.ratePercent}%`,
            });
            rows.push({ label: "所得税", value: formatYen(bracket.amounts.incomeTax), sub: true });
            rows.push({ label: "復興特別所得税", value: formatYen(bracket.amounts.reconstruction), sub: true });
            rows.push({ label: "住民税", value: formatYen(bracket.amounts.residentTax), sub: true });
        });

        if (rows.length === 0) {
            rows.push({ label: "課税譲渡所得なし", value: formatYen(0) });
        }

        rows.push(
            { label: "所得税 合計", value: formatYen(result.tax.incomeTax) },
            { label: "復興特別所得税 合計", value: formatYen(result.tax.reconstruction) },
            { label: "住民税 合計", value: formatYen(result.tax.residentTax) },
            { label: "税額合計", value: formatYen(result.tax.total), highlight: true },
            {
                label: "手取り概算",
                value: formatYen(result.netProceeds),
                note: "譲渡価額 − 譲渡費用 − 税額",
                highlight: true,
            },
        );
        return rows;
    }, [result]);

    return (
        <section className="result-section">
            <h2>計算結果（不動産の譲渡）</h2>
            <div className="result-grid">
                <ResultTable caption="譲渡所得の計算" rows={incomeRows} />
                <ResultTable caption="税額の計算" rows={taxRows} />
            </div>
            <NoteList notes={result.notes} />
        </section>
    );
};

export default RealEstateResultView;
