"use client";

import { useRouter } from "next/navigation";
import { ValuationResult } from "@/components/valuation/ValuationResult";
import { useValuationData } from "@/hooks/useValuationData";

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
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ValuationResult
          basicInfo={basicInfo}
          financials={financials}
          onBack={handleBack}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
