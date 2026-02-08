"use client";

import { useRouter } from "next/navigation";
import { ValuationSimulation } from "@/components/valuation/ValuationSimulation";
import { useValuationData } from "@/hooks/useValuationData";

export default function Step8Page() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    router.push("/valuation/step7");
  };

  const handleHome = () => {
    router.push("/");
  };

  const handleSummary = () => {
    router.push("/valuation/step9");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ValuationSimulation
          basicInfo={basicInfo}
          financials={financials}
          onBack={handleBack}
          onHome={handleHome}
          onSummary={handleSummary}
        />
      </div>
    </div>
  );
}
