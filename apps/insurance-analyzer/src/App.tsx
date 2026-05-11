import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import PrintFooter from "@/components/PrintFooter";
import PolicyInputTab from "@/components/tabs/PolicyInputTab";
import DiagnosisTab from "@/components/tabs/DiagnosisTab";
import ReportTab from "@/components/tabs/ReportTab";
import { ClipboardIcon, StethoscopeIcon, BarChartIcon } from "@/components/ui/Icons";
import { useInsuranceForm } from "@/hooks/useInsuranceForm";

import type { Tab, TabItem } from "@/components/Header";

const TABS: TabItem[] = [
    { key: 'input', label: '証券入力', shortLabel: '入力', icon: <ClipboardIcon /> },
    { key: 'diagnosis', label: '診断結果', shortLabel: '診断', icon: <StethoscopeIcon /> },
    { key: 'report', label: 'レポート', shortLabel: 'レポート', icon: <BarChartIcon /> },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('input');
    const { formProps, result, isDirty } = useInsuranceForm();

    const handleCalculateAndSwitch = useCallback(() => {
        formProps.onCalculate();
        setActiveTab('diagnosis');
    }, [formProps.onCalculate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter" && formProps.canCalculate) {
                e.preventDefault();
                handleCalculateAndSwitch();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleCalculateAndSwitch, formProps.canCalculate]);

    const activeTabLabel = TABS.find(t => t.key === activeTab)?.label ?? '';

    return (
        <div className="w-full min-h-screen bg-white flex flex-col">
            <Header tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} onPrint={() => window.print()} />

            <div className="hidden print-only px-4 pt-4 pb-2 border-b border-gray-300">
                <h1 className="text-lg font-bold text-emerald-800 m-0">保険証券診断ツール — {activeTabLabel}</h1>
            </div>

            <div className="flex flex-col flex-1">
                {activeTab === 'input' ? (
                    <PolicyInputTab
                        {...formProps}
                        onCalculate={handleCalculateAndSwitch}
                        hasResult={!!result}
                    />
                ) : activeTab === 'diagnosis' ? (
                    <DiagnosisTab result={result} isDirty={isDirty} />
                ) : (
                    <ReportTab result={result} isDirty={isDirty} />
                )}
            </div>
            <PrintFooter />
        </div>
    );
}
