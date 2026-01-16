"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BasicInfo, Financials } from "@/types/valuation";
import { CorporateTaxFairValue } from "@/components/valuation/CorporateTaxFairValue";

export default function Step7Page() {
  const router = useRouter();
  const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);

  useEffect(() => {
    // Load saved data from sessionStorage
    const savedBasic = sessionStorage.getItem("valuationBasicInfo");
    const savedFinancials = sessionStorage.getItem("valuationFinancials");

    if (savedBasic && savedFinancials) {
      try {
        setBasicInfo(JSON.parse(savedBasic));
        setFinancials(JSON.parse(savedFinancials));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        router.push("/valuation/step1");
      }
    } else {
      // No data, redirect to step 1
      router.push("/valuation/step1");
    }
  }, [router]);

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
