"use client";

import { useRouter } from "next/navigation";
import { ValuationResult } from "@/components/valuation/ValuationResult";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step6Page() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    router.push("/valuation/step5");
  };

  const handleNext = () => {
    router.push("/valuation/step7");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <PageLayout>
      <ValuationResult
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onNext={handleNext}
      />
    </PageLayout>
  );
}
