"use client";

import { useRouter } from "next/navigation";
import { ValuationSimulation } from "@/components/valuation/ValuationSimulation";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

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
    <PageLayout>
      <ValuationSimulation
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onHome={handleHome}
        onSummary={handleSummary}
      />
    </PageLayout>
  );
}
