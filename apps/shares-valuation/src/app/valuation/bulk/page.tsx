"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ValuationBulkInput } from "@/components/valuation/ValuationBulkInput";
import { BasicInfo, Financials } from "@/types/valuation";

export default function ValuationBulkInputPage() {
  const router = useRouter();
  const [defaultBasicInfo, setDefaultBasicInfo] = useState<BasicInfo | null>(
    null,
  );
  const [defaultFinancials, setDefaultFinancials] = useState<Financials | null>(
    null,
  );

  useEffect(() => {
    // Load saved data from sessionStorage
    const savedBasic = sessionStorage.getItem("valuationBasicInfo");
    const savedFinancials = sessionStorage.getItem("valuationFinancials");

    if (savedBasic) {
      try {
        setDefaultBasicInfo(JSON.parse(savedBasic));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
      }
    }

    if (savedFinancials) {
      try {
        setDefaultFinancials(JSON.parse(savedFinancials));
      } catch (e) {
        console.error("Failed to parse financials:", e);
      }
    }
  }, []);

  const handleSubmit = (basicInfo: BasicInfo, financials: Financials) => {
    // Save to sessionStorage
    sessionStorage.setItem("valuationBasicInfo", JSON.stringify(basicInfo));
    sessionStorage.setItem("valuationFinancials", JSON.stringify(financials));
    // Navigate to result page
    router.push("/valuation/step6");
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ValuationBulkInput
          onSubmit={handleSubmit}
          onBack={handleBack}
          defaultBasicInfo={defaultBasicInfo}
          defaultFinancials={defaultFinancials}
        />
      </div>
    </div>
  );
}
