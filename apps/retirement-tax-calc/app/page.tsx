"use client";

import Header from "@/components/Header";
import RetirementForm from "@/components/RetirementForm";
import ResultSection from "@/components/ResultSection";
import PrintFooter from "@/components/PrintFooter";
import { useRetirementTaxForm } from "@/hooks/useRetirementTaxForm";

export default function Home() {
    const { formProps, results, isDirty } = useRetirementTaxForm();

    return (
        <div className="container-custom">
            <Header onPrint={() => window.print()} />
            <div className="main-layout">
                <RetirementForm {...formProps} />
                <ResultSection results={results} isDirty={isDirty} />
            </div>
            <PrintFooter />
        </div>
    );
}
