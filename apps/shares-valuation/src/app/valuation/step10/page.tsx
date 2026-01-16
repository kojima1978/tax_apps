"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrintAllSteps } from "@/components/valuation/PrintAllSteps";
import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";

export default function DetailsPage() {
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
    router.push("/valuation/step9");
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
        {/* Navigation buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-center gap-4 mb-6 no-print">
          <Button type="button" variant="outline" onClick={handleBack} size="lg">
            比較表に戻る
          </Button>
          <Button type="button" variant="outline" onClick={handleHome} size="lg">
            トップに戻る
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            size="lg"
          >
            印刷
          </Button>
        </div>

        {/* PrintAllSteps component */}
        <PrintAllSteps basicInfo={basicInfo} financials={financials} />
      </div>
    </div>
  );
}
