import { useCallback, useMemo, useState } from "react";
import Header from "./components/Header";
import MinimumTaxSection from "./components/MinimumTaxSection";
import PrintMeta from "./components/PrintMeta";
import RealEstateForm from "./components/RealEstateForm";
import RealEstateResultView from "./components/RealEstateResult";
import ReferenceTables from "./components/ReferenceTables";
import RemarksBox from "./components/RemarksBox";
import SecuritiesForm from "./components/SecuritiesForm";
import SecuritiesResultView from "./components/SecuritiesResult";
import TabNav from "./components/TabNav";
import { CalculatorIcon } from "./components/Icons";
import { useMinimumTax } from "./hooks/useMinimumTax";
import { INITIAL_PRINT_OPTIONS, type PrintOptionKey, type PrintOptions } from "./lib/print-options";
import { useRealEstateForm } from "./hooks/useRealEstateForm";
import { useSecuritiesForm } from "./hooks/useSecuritiesForm";
import { TABS, type TabKey } from "./lib/tabs";

const App = () => {
    const [tab, setTab] = useState<TabKey>("real-estate");
    const [printOptions, setPrintOptions] = useState<PrintOptions>(INITIAL_PRINT_OPTIONS);
    const realEstate = useRealEstateForm();
    const securities = useSecuritiesForm();

    const setPrintOption = useCallback((key: PrintOptionKey, value: boolean) => {
        setPrintOptions((prev) => ({ ...prev, [key]: value }));
    }, []);

    // 基準所得金額はその年の全所得の合算なので、タブをまたいで足し込む
    const minimumTaxSource = useMemo(
        () => ({
            year: Number(realEstate.form.transferDate.slice(0, 4)) || new Date().getFullYear(),
            capitalGainsIncome: realEstate.result.taxableIncome + securities.result.taxableIncome,
            capitalGainsIncomeTax: realEstate.result.tax.incomeTax + securities.result.tax.incomeTax,
        }),
        [realEstate.form.transferDate, realEstate.result, securities.result],
    );
    const minimumTax = useMinimumTax(minimumTaxSource);

    const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
    const hasInput = tab === "real-estate" ? realEstate.hasInput : securities.hasInput;

    return (
        <>
            <Header
                printOptions={printOptions}
                onPrintOptionChange={setPrintOption}
                onPrint={() => window.print()}
            />

            {/* 参考資料を印刷するかは印刷スタイル側で見分けるので、クラスで印を付ける */}
            <main className={`container-custom${printOptions.reference ? " print-with-reference" : ""}`}>
                {/* 1枚目。印刷では用紙の高さいっぱいに広げ、余った分は末尾の備考欄が吸収する */}
                <div className="print-sheet">
                    <div className="page-header">
                        <CalculatorIcon />
                        <div>
                            <h1>譲渡所得税 計算ツール</h1>
                            <p>不動産・株式等の譲渡にかかる所得税・復興特別所得税・住民税を試算します（分離課税）</p>
                        </div>
                    </div>

                    <PrintMeta />

                    <p className="print-only print-subtitle">対象: {activeTab.label}（{activeTab.description}）</p>

                    <TabNav active={tab} onChange={setTab} />

                    {/* 印刷ではこの中だけを3段組にする（見出し・免責・備考欄は段組の外） */}
                    <div className="print-columns">
                        <div
                            role="tabpanel"
                            id={`panel-${tab}`}
                            aria-labelledby={`tab-${tab}`}
                            key={tab}
                        >
                            {tab === "real-estate" ? (
                                <RealEstateForm
                                    form={realEstate.form}
                                    setField={realEstate.setField}
                                    reset={realEstate.reset}
                                    result={realEstate.result}
                                />
                            ) : (
                                <SecuritiesForm
                                    form={securities.form}
                                    setField={securities.setField}
                                    reset={securities.reset}
                                />
                            )}

                            {hasInput ? (
                                tab === "real-estate" ? (
                                    <RealEstateResultView form={realEstate.form} result={realEstate.result} />
                                ) : (
                                    <SecuritiesResultView form={securities.form} result={securities.result} />
                                )
                            ) : (
                                <p className="empty-state no-print">譲渡価額を入力すると計算結果が表示されます。</p>
                            )}
                        </div>

                        <MinimumTaxSection
                            form={minimumTax.form}
                            setField={minimumTax.setField}
                            result={minimumTax.result}
                            source={minimumTaxSource}
                        />
                    </div>

                    <p className="disclaimer">
                        本ツールは概算の試算用です。特例の適用要件の判定、譲渡損失の損益通算・繰越控除、
                        買換え特例、空き家の3,000万円特別控除などは反映していません。
                        実際の申告にあたっては個別に確認してください。
                    </p>

                    <RemarksBox />
                </div>

                {/*
                 * 参考資料は2枚目。1枚目のすべてより後ろに置かないと、
                 * 改ページで免責などが一緒に2枚目へ送られてしまう。
                 */}
                <div className="reference-sheet">
                    <ReferenceTables />
                    <RemarksBox />
                </div>
            </main>
        </>
    );
};

export default App;
