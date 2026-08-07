import { useMemo } from "react";
import CheckboxField from "./CheckboxField";
import CurrencyField from "./CurrencyField";
import NoteList from "./NoteList";
import ResultTable, { type ResultRow } from "./ResultTable";
import type { MinimumTaxFormState, MinimumTaxSource } from "@/hooks/useMinimumTax";
import { MINIMUM_TAX_RATE, MINIMUM_TAX_THRESHOLD, type MinimumTaxResult } from "@/lib/minimum-tax";
import { formatYen, parseFormattedNumber } from "@/lib/utils";

type MinimumTaxSectionProps = {
    form: MinimumTaxFormState;
    setField: <K extends keyof MinimumTaxFormState>(key: K, value: MinimumTaxFormState[K]) => void;
    result: MinimumTaxResult;
    source: MinimumTaxSource;
};

const ratePercent = MINIMUM_TAX_RATE * 100;

const MinimumTaxSection = ({ form, setField, result, source }: MinimumTaxSectionProps) => {
    const incomeRows = useMemo<ResultRow[]>(
        () => [
            { label: "課税譲渡所得金額（本ツールの計算）", value: formatYen(source.capitalGainsIncome) },
            { label: "その他の合計所得金額", value: formatYen(parseFormattedNumber(form.otherIncome)) },
            { label: "基準所得金額", value: formatYen(result.baseIncome), highlight: true },
            { label: "特別控除額", value: `− ${formatYen(MINIMUM_TAX_THRESHOLD)}` },
            { label: "3億3,000万円を超える部分", value: formatYen(result.excessIncome) },
            {
                label: "① 上記に対する税額",
                value: formatYen(result.calculatedTax),
                note: `税率 ${ratePercent}%`,
                highlight: true,
            },
        ],
        [form.otherIncome, result, source.capitalGainsIncome],
    );

    const taxRows = useMemo<ResultRow[]>(() => {
        const rows: ResultRow[] = [
            { label: "譲渡所得に対する所得税額（本ツールの計算）", value: formatYen(source.capitalGainsIncomeTax) },
            { label: "その他の所得に対する所得税額", value: formatYen(parseFormattedNumber(form.otherIncomeTax)) },
            { label: "② 基準所得税額", value: formatYen(result.baseIncomeTax), highlight: true },
        ];

        if (result.applies) {
            rows.push(
                { label: "追加納付する所得税額（① − ②）", value: formatYen(result.additionalIncomeTax) },
                { label: "復興特別所得税", value: formatYen(result.additionalReconstruction), sub: true },
                { label: "追加納付額 合計", value: formatYen(result.additionalTotal), highlight: true },
            );
        } else {
            rows.push({ label: "追加納付額", value: "なし", highlight: true });
        }
        return rows;
    }, [form.otherIncomeTax, result, source.capitalGainsIncomeTax]);

    return (
        // 判定しない場合は印刷物に出さない（該当者は稀なため）
        <section className={`minimum-tax-section${form.enabled ? "" : " no-print"}`}>
            <h2>ミニマムタックス（極めて高い水準の所得に対する課税）</h2>
            <p className="section-lead">
                令和7年分以後の所得税では、基準所得金額が3億3,000万円を超える場合に追加の課税が行われます
                （措法41条の19）。分離課税の譲渡所得も基準所得金額に含まれます。
            </p>

            <div className="form-section">
                <fieldset>
                    <legend>判定</legend>
                    <CheckboxField
                        label="ミニマムタックスの判定を行う"
                        checked={form.enabled}
                        onChange={(v) => setField("enabled", v)}
                        hint={`対象年分: ${source.year}年分（不動産タブの譲渡日から判定。未入力の場合は本年）`}
                    />

                    {form.enabled && (
                        <div className="form-row">
                            <CurrencyField
                                label="その他の合計所得金額"
                                value={form.otherIncome}
                                onChange={(v) => setField("otherIncome", v)}
                                hint="給与・事業・不動産所得など、本ツールで計算していない所得の合計。申告不要を選択した上場株式等の配当・利子等も含めます"
                            />
                            <CurrencyField
                                label="その他の所得に対する所得税額"
                                value={form.otherIncomeTax}
                                onChange={(v) => setField("otherIncomeTax", v)}
                                hint="上記に対する所得税額（復興特別所得税を含まない額。外国税額控除の適用前）"
                            />
                        </div>
                    )}
                </fieldset>
            </div>

            {form.enabled && (
                <>
                    <div className="result-grid">
                        <ResultTable caption="基準所得金額の計算" rows={incomeRows} />
                        <ResultTable caption="基準所得税額との比較" rows={taxRows} />
                    </div>
                    <NoteList notes={result.notes} />
                </>
            )}
        </section>
    );
};

export default MinimumTaxSection;
