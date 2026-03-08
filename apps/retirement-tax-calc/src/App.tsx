import { useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import RetirementForm from "@/components/RetirementForm";
import ResultSection from "@/components/ResultSection";
import PrintFooter from "@/components/PrintFooter";
import { useRetirementTaxForm } from "@/hooks/useRetirementTaxForm";

export default function App() {
    const { formProps, results, isDirty } = useRetirementTaxForm();
    const resultRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // C3: 計算後に結果セクションへスムーズスクロール
    const handleCalculateWithScroll = useCallback(() => {
        formProps.onCalculate();
        requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [formProps.onCalculate]);

    // B2: Ctrl+Enter で計算実行
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

    // C1: PDF出力
    const handlePdf = useCallback(async () => {
        const element = containerRef.current;
        if (!element) return;
        element.classList.add("pdf-generating");
        try {
            const html2pdf = (await import("html2pdf.js")).default;
            await html2pdf()
                .set({
                    margin: 8,
                    filename: "退職金税額計算.pdf",
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(element)
                .save();
        } finally {
            element.classList.remove("pdf-generating");
        }
    }, []);

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
