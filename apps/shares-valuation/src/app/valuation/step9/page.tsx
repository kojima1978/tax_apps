"use client";

import { useRouter } from "next/navigation";
import { ValuationSummary } from "@/components/valuation/ValuationSummary";
import { useValuationData } from "@/hooks/useValuationData";

export default function SummaryPage() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    router.push("/valuation/step8");
  };

  const handleHome = () => {
    router.push("/");
  };

  const handleDetails = () => {
    router.push("/valuation/step10");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ValuationSummary
          basicInfo={basicInfo}
          financials={financials}
          onBack={handleBack}
          onHome={handleHome}
          onDetails={handleDetails}
        />
      </div>
    </div>
  );
}
