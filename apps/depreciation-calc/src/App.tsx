import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Header from "@/components/Header";
import UsedAssetForm from "@/components/UsedAssetForm";
import ResultSection from "@/components/ResultSection";
import DepreciationForm from "@/components/DepreciationForm";
import DepreciationResultSection from "@/components/DepreciationResult";
import PeriodDepForm from "@/components/PeriodDepForm";
import PeriodDepResultSection from "@/components/PeriodDepResult";
import ReferenceLinks from "@/components/ReferenceLinks";
import PrintFooter from "@/components/PrintFooter";
import { CalendarIcon, ClockIcon, CalculatorIcon } from "@/components/ui/Icons";
import { useUsedAssetForm } from "@/hooks/useUsedAssetForm";
import { useDepreciationForm } from "@/hooks/useDepreciationForm";
import { usePeriodDepForm } from "@/hooks/usePeriodDepForm";
import { parseFormattedNumber } from "@/lib/utils";

type Tab = 'life' | 'depreciation' | 'period';

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'period', label: '期間償却', icon: <CalendarIcon /> },
    { key: 'life', label: '（中古）耐用年数', icon: <ClockIcon /> },
    { key: 'depreciation', label: '簿価計算', icon: <CalculatorIcon /> },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('period');
    const { formProps, result, isDirty } = useUsedAssetForm();
    const { formProps: depFormProps, result: depResult, isDirty: depIsDirty, applyCarryOver } = useDepreciationForm();
    const { formProps: fiveFormProps, result: fiveResult, isDirty: fiveIsDirty, applyCarryOver: fiveApplyCarryOver } = usePeriodDepForm();
    const resultRef = useRef<HTMLDivElement>(null);

    // 耐用年数タブの計算結果を簿価タブに引き継ぐ
    const handleCarryOver = useCallback(() => {
        if (!result) return;
        applyCarryOver({
            usefulLife: result.usedAssetLife,
            acquisitionCost: parseFormattedNumber(formProps.acquisitionCost),
            acquisitionDate: formProps.acquisitionDate,
        });
        setActiveTab('depreciation');
    }, [result, applyCarryOver, formProps.acquisitionCost, formProps.acquisitionDate]);

    // 簿価タブの入力値を期間償却タブに引き継ぐ
    const handleCarryOverToFiveYear = useCallback(() => {
        if (!depResult) return;
        fiveApplyCarryOver({
            usefulLife: depResult.input.usefulLife,
            acquisitionCost: depResult.input.acquisitionCost,
            acquisitionDate: depResult.input.acquisitionDate,
            method: depResult.input.method,
            serviceStartDate: depResult.input.serviceStartDate,
            fiscalYearEndMonth: String(depResult.input.fiscalYearEndMonth),
        });
        setActiveTab('period');
    }, [depResult, fiveApplyCarryOver]);

    const handleCalculateWithScroll = useCallback(() => {
        if (activeTab === 'life') {
            formProps.onCalculate();
        } else if (activeTab === 'depreciation') {
            depFormProps.onCalculate();
        } else {
            fiveFormProps.onCalculate();
        }
        requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [activeTab, formProps.onCalculate, depFormProps.onCalculate, fiveFormProps.onCalculate]);

    // Ctrl+Enter で計算実行
    useEffect(() => {
        const canCalc = activeTab === 'life'
            ? formProps.canCalculate
            : activeTab === 'depreciation'
                ? depFormProps.canCalculate
                : fiveFormProps.canCalculate;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter" && canCalc) {
                e.preventDefault();
                handleCalculateWithScroll();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleCalculateWithScroll, activeTab, formProps.canCalculate, depFormProps.canCalculate, fiveFormProps.canCalculate]);

    const activeTabLabel = TABS.find(t => t.key === activeTab)?.label ?? '';

    return (
        <div className="w-full min-h-screen bg-white flex flex-col">
            <Header onPrint={() => window.print()} />

            {/* 印刷用ヘッダー */}
            <div className="hidden print-only px-4 pt-4 pb-2 border-b border-gray-300">
                <h1 className="text-lg font-bold text-green-800 m-0">減価償却ツール — {activeTabLabel}</h1>
            </div>

            {/* タブ切替 */}
            <div className="flex border-b border-gray-200 no-print">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-bold cursor-pointer transition-colors border-b-2 ${
                            activeTab === tab.key
                                ? 'text-green-800 border-green-800 bg-green-50/50'
                                : 'text-gray-500 border-transparent hover:text-green-700 hover:bg-gray-50'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col">
                {activeTab === 'life' ? (
                    <>
                        <UsedAssetForm
                            {...formProps}
                            hasResult={!!result}
                            onCalculate={handleCalculateWithScroll}
                        />
                        <div ref={resultRef}>
                            <ResultSection result={result} isDirty={isDirty} onCarryOver={result ? handleCarryOver : undefined} />
                        </div>
                    </>
                ) : activeTab === 'depreciation' ? (
                    <>
                        <DepreciationForm
                            {...depFormProps}
                            hasResult={!!depResult}
                            onCalculate={handleCalculateWithScroll}
                        />
                        <div ref={resultRef}>
                            <DepreciationResultSection
                                result={depResult}
                                isDirty={depIsDirty}
                                onCarryOverFiveYear={depResult ? handleCarryOverToFiveYear : undefined}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <PeriodDepForm
                            {...fiveFormProps}
                            hasResult={!!fiveResult}
                            onCalculate={handleCalculateWithScroll}
                        />
                        <div ref={resultRef}>
                            <PeriodDepResultSection result={fiveResult} isDirty={fiveIsDirty} />
                        </div>
                    </>
                )}
            </div>
            <ReferenceLinks />
            <PrintFooter />
        </div>
    );
}
