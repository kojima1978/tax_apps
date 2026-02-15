"use client";

import { useRouter } from "next/navigation";
import { ValuationSummary } from "@/components/valuation/ValuationSummary";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

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
    <PageLayout>
      <ValuationSummary
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onHome={handleHome}
        onDetails={handleDetails}
      />
    </PageLayout>
  );
}
