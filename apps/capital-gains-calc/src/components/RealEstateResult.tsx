import { useMemo } from "react";
import NoteList from "./NoteList";
import ResultTable from "./ResultTable";
import type { RealEstateResult as RealEstateResultType } from "@/lib/capital-gains";
import { netProceedsRows, taxBreakdownRows, taxTotalRows, type ResultRow } from "@/lib/result-rows";
import { findStructure } from "@/lib/tax-rates";
import { formatYen, parseFormattedNumber } from "@/lib/utils";
import { TRANSFER_EXPENSE_ITEMS, type RealEstateFormState } from "@/hooks/useRealEstateForm";

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
                { label: "土地の取得価額", value: formatYen(result.landCost), sub: true },
                { label: "建物の取得価額", value: formatYen(result.buildingCost), sub: true },
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

        rows.push({ label: "譲渡費用", value: formatYen(result.transferExpense) });

        // 内訳は入力のあった項目だけ出す（0円の行で結果表が伸びないように）
        TRANSFER_EXPENSE_ITEMS.forEach((item) => {
            const amount = parseFormattedNumber(form[item.key]);
            if (amount > 0) {
                rows.push({ label: item.label, value: formatYen(amount), sub: true });
            }
        });

        rows.push({ label: "譲渡所得金額", value: formatYen(result.grossProfit), highlight: true });

        if (result.specialDeduction > 0) {
            rows.push({ label: "特別控除（居住用財産 3,000万円）", value: `− ${formatYen(result.specialDeduction)}` });
        }

        rows.push({ label: "課税譲渡所得金額", value: formatYen(result.taxableIncome), highlight: true });
        return rows;
    }, [form, result, transferPrice]);

    /**
     * 印刷では入力欄を出さない（内容がこの結果表とほぼ重複するため）。
     * そこで、結果表に現れない前提条件だけをここで1行にまとめる。
     */
    const conditions = useMemo(() => {
        const items: string[] = [];
        const date = (v: string) => v.replace(/-/g, "/");

        if (form.transferDate) items.push(`譲渡日 ${date(form.transferDate)}`);
        if (form.acquisitionDate) items.push(`取得日 ${date(form.acquisitionDate)}`);
        if (result.ownershipYears !== null) {
            const term = result.isLongTerm ? "長期譲渡" : "短期譲渡";
            items.push(`所有期間 ${result.ownershipYears}年（${term}${result.isOver10Years ? "・10年超" : ""}）`);
        }
        if (form.costMode === "actual" && result.buildingCost > 0) {
            // 構造は非事業用の償却率にしか使わないので、事業用のときは用途だけ出す
            const isNonBusiness = form.buildingUsage === "non-business";
            const structure = isNonBusiness ? `・${findStructure(form.structureKey).label}` : "";
            items.push(`建物 ${isNonBusiness ? "非事業用" : "事業用"}${structure}`);
        }

        const specials = [
            form.isResidence && "居住用財産",
            form.useSpecialDeduction && "3,000万円特別控除",
            form.useReducedRate && "軽減税率",
            parseFormattedNumber(form.inheritedCostAddition) > 0 && "取得費加算",
        ].filter(Boolean);
        if (specials.length > 0) items.push(`適用 ${specials.join("・")}`);

        return items.join("　／　");
    }, [form, result]);

    const taxRows = useMemo<ResultRow[]>(() => {
        const rows: ResultRow[] = [];
        // 区分が1つなら、その明細がそのまま税目ごとの合計になる。
        // 合計行を別に立てると同じ数字の繰り返しにしかならないので、明細側を小計入りの形で出す
        const isSingleBracket = result.brackets.length < 2;

        result.brackets.forEach((bracket) => {
            rows.push({ label: bracket.label, value: formatYen(bracket.taxableAmount) });
            rows.push(
                ...(isSingleBracket
                    ? taxTotalRows(bracket.amounts, bracket.rate)
                    : taxBreakdownRows(bracket.amounts, bracket.rate, true)),
            );
        });

        if (rows.length === 0) {
            rows.push({ label: "課税譲渡所得なし", value: formatYen(0) });
        }

        if (!isSingleBracket) {
            rows.push(...taxTotalRows(result.tax, undefined, true));
        }

        rows.push(
            { label: "税額合計", value: formatYen(result.tax.total), highlight: true },
            ...netProceedsRows({
                transferPrice,
                transferExpense: result.transferExpense,
                tax: result.tax.total,
                netProceeds: result.netProceeds,
            }),
        );
        return rows;
    }, [result, transferPrice]);

    return (
        <section className="result-section">
            <h2>計算結果（不動産の譲渡）</h2>
            {conditions && <p className="print-only print-conditions">{conditions}</p>}
            <div className="result-grid">
                <ResultTable caption="譲渡所得の計算" rows={incomeRows} />
                <ResultTable caption="税額の計算" rows={taxRows} />
            </div>
            <NoteList notes={result.notes} />
        </section>
    );
};

export default RealEstateResultView;
