import { useState } from "react";
import Header from "./components/Header";
import PrintFooter from "./components/PrintFooter";
import RealEstateForm from "./components/RealEstateForm";
import RealEstateResultView from "./components/RealEstateResult";
import ReferenceTables from "./components/ReferenceTables";
import SecuritiesForm from "./components/SecuritiesForm";
import SecuritiesResultView from "./components/SecuritiesResult";
import TabNav from "./components/TabNav";
import { CalculatorIcon } from "./components/Icons";
import { useRealEstateForm } from "./hooks/useRealEstateForm";
import { useSecuritiesForm } from "./hooks/useSecuritiesForm";
import { TABS, type TabKey } from "./lib/tabs";

const App = () => {
    const [tab, setTab] = useState<TabKey>("real-estate");
    const realEstate = useRealEstateForm();
    const securities = useSecuritiesForm();

    const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
    const hasInput = tab === "real-estate" ? realEstate.hasInput : securities.hasInput;

    return (
        <>
            <Header onPrint={() => window.print()} />

            <main className="container-custom">
                <div className="page-header">
                    <CalculatorIcon />
                    <div>
                        <h1>譲渡所得税 計算ツール</h1>
                        <p>不動産・株式等の譲渡にかかる所得税・復興特別所得税・住民税を試算します（分離課税）</p>
                    </div>
                </div>

                <p className="print-only print-subtitle">対象: {activeTab.label}（{activeTab.description}）</p>

                <TabNav active={tab} onChange={setTab} />

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

                <ReferenceTables />

                <p className="disclaimer">
                    本ツールは概算の試算用です。特例の適用要件の判定、譲渡損失の損益通算・繰越控除、
                    買換え特例、空き家の3,000万円特別控除などは反映していません。
                    実際の申告にあたっては個別に確認してください。
                </p>

                <PrintFooter />
            </main>
        </>
    );
};

export default App;
