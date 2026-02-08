"use client";

import { useRouter } from "next/navigation";
import { PrintAllSteps } from "@/components/valuation/PrintAllSteps";
import { Button } from "@/components/ui/Button";
import { useValuationData } from "@/hooks/useValuationData";

export default function DetailsPage() {
  const router = useRouter();
  const { basicInfo, financials } = useValuationData();

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
