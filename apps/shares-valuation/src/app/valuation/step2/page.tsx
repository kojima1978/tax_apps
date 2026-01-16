"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CompanySizeForm } from "@/components/valuation/CompanySizeForm";
import { BasicInfo } from "@/types/valuation";

export default function Step2Page() {
  const router = useRouter();
  const [basicInfo, setBasicInfo] = useState<
    BasicInfo | Partial<BasicInfo> | null
  >(null);

  useEffect(() => {
    // Load saved data from sessionStorage
    const saved = sessionStorage.getItem("valuationBasicInfo");
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        setBasicInfo(parsedData);
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        router.push("/valuation/step1");
      }
    } else {
      // No data, redirect to step 1
      router.push("/valuation/step1");
    }
  }, [router]);

  const handleNext = (data: Partial<BasicInfo>) => {
    // Merge with existing data
    const merged = { ...basicInfo, ...data };
    sessionStorage.setItem("valuationBasicInfo", JSON.stringify(merged));
    router.push("/valuation/step3");
  };

  const handleBack = () => {
    router.push("/valuation/step1");
  };

  const handleFormChange = (data: Partial<BasicInfo>) => {
    // Save to sessionStorage immediately without updating state
    const merged = { ...basicInfo, ...data };
    sessionStorage.setItem("valuationBasicInfo", JSON.stringify(merged));
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <CompanySizeForm
          onNext={handleNext}
          onBack={handleBack}
          defaultValues={basicInfo}
          onChange={handleFormChange}
        />
      </div>
    </div>
  );
}
