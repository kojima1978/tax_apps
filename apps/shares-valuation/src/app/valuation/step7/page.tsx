"use client";

import { useRouter } from "next/navigation";
import { CorporateTaxFairValue } from "@/components/valuation/CorporateTaxFairValue";
import { useValuationData } from "@/hooks/useValuationData";

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
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <CorporateTaxFairValue
          basicInfo={basicInfo}
          financials={financials}
          onBack={handleBack}
          onNext={handleNext}
          onHome={handleHome}
        />
      </div>
    </div>
  );
}
