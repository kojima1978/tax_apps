"use client";

import { useRouter } from "next/navigation";
import { OwnDataForm } from "@/components/valuation/OwnDataForm";
import { Financials } from "@/types/valuation";
import { useValuationFormData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step3Page() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationFormData();

  const handleNext = (data: Partial<Financials>) => {
    // Merge with existing financials data
    const merged = { ...financials, ...data };
    sessionStorage.setItem("valuationFinancials", JSON.stringify(merged));
    router.push("/valuation/step4");
  };

  const handleBack = () => {
    router.push("/valuation/step2");
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <PageLayout narrow>
      <OwnDataForm
        basicInfo={basicInfo}
        onNext={handleNext}
        onBack={handleBack}
        defaultValues={financials || undefined}
      />
    </PageLayout>
  );
}
