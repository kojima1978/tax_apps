"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ValuationSimulation } from "@/components/valuation/ValuationSimulation";
import { BasicInfo, Financials } from "@/types/valuation";

export default function Step8Page() {
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
