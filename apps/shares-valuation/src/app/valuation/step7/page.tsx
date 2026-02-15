"use client";

import { useRouter } from "next/navigation";
import { CorporateTaxFairValue } from "@/components/valuation/CorporateTaxFairValue";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step7Page() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    router.push("/valuation/step6");
  };

  const handleNext = () => {
    router.push("/valuation/step8");
  };

  const handleHome = () => {
    router.push("/");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <PageLayout>
      <CorporateTaxFairValue
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onNext={handleNext}
        onHome={handleHome}
      />
    </PageLayout>
  );
}
