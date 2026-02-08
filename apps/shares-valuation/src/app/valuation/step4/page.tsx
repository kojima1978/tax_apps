"use client";

import { useRouter } from "next/navigation";
import { IndustryDataForm } from "@/components/valuation/IndustryDataForm";
import { Financials } from "@/types/valuation";
import { useValuationFormData } from "@/hooks/useValuationData";

export default function Step4Page() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationFormData();

  const handleNext = (data: Partial<Financials>) => {
    // Merge with existing financials data
    const merged = { ...financials, ...data };
    sessionStorage.setItem("valuationFinancials", JSON.stringify(merged));
    router.push("/valuation/step5");
  };

  const handleBack = () => {
    router.push("/valuation/step3");
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <IndustryDataForm
          basicInfo={basicInfo as import("@/types/valuation").BasicInfo}
          onNext={handleNext}
          onBack={handleBack}
          defaultValues={financials || undefined}
        />
      </div>
    </div>
  );
}
