"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OwnDataForm } from "@/components/valuation/OwnDataForm";
import { BasicInfo, Financials } from "@/types/valuation";

export default function Step3Page() {
  const router = useRouter();
  const [basicInfo, setBasicInfo] = useState<
    BasicInfo | Partial<BasicInfo> | null
  >(null);
  const [financials, setFinancials] = useState<Partial<Financials> | null>(
    null,
  );

  useEffect(() => {
    // Load saved data from sessionStorage
    const savedBasic = sessionStorage.getItem("valuationBasicInfo");
    const savedFinancials = sessionStorage.getItem("valuationFinancials");

    if (savedBasic) {
      try {
        setBasicInfo(JSON.parse(savedBasic));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        router.push("/valuation/step1");
        return;
      }
    } else {
      // No data, redirect to step 1
      router.push("/valuation/step1");
      return;
    }

    if (savedFinancials) {
      try {
        setFinancials(JSON.parse(savedFinancials));
      } catch (e) {
        console.error("Failed to parse financials:", e);
      }
    }
  }, [router]);

  const handleNext = (data: Partial<Financials>) => {
    // Merge with existing financials data
    const merged = { ...financials, ...data };
    sessionStorage.setItem("valuationFinancials", JSON.stringify(merged));
    router.push("/valuation/step4");
  };

  const handleBack = () => {
    router.push("/valuation/step2");
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <OwnDataForm
          basicInfo={basicInfo}
          onNext={handleNext}
          onBack={handleBack}
          defaultValues={financials || undefined}
        />
      </div>
    </div>
  );
}
