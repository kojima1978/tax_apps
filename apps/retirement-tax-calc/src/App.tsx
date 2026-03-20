import { useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import RetirementForm from "@/components/RetirementForm";
import ResultSection from "@/components/ResultSection";
import PrintFooter from "@/components/PrintFooter";
import { useRetirementTaxForm } from "@/hooks/useRetirementTaxForm";
import { usePdfExport } from "@/hooks/usePdfExport";

export default function App() {
    const { formProps, results, isDirty } = useRetirementTaxForm();
    const resultRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const handlePdf = usePdfExport(containerRef);

    // 計算後に結果セクションへスムーズスクロール
    const handleCalculateWithScroll = useCallback(() => {
        formProps.onCalculate();
        requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [formProps.onCalculate]);

    // Ctrl+Enter で計算実行
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter" && formProps.canCalculate) {
                e.preventDefault();
                handleCalculateWithScroll();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleCalculateWithScroll, formProps.canCalculate]);

    return (
        <div className="container-custom" ref={containerRef}>
            <Header
                onPrint={() => window.print()}
                onPdf={handlePdf}
            />
            <div className="main-layout">
                <RetirementForm
                    {...formProps}
                    onCalculate={handleCalculateWithScroll}
                />
                <div ref={resultRef}>
                    <ResultSection results={results} isDirty={isDirty} />
                </div>
            </div>
            <PrintFooter />
        </div>
    );
}
