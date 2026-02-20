import { useNavigate } from "react-router-dom";
import { ValuationResult } from "@/components/valuation/ValuationResult";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step6Page() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    navigate("/valuation/step5");
  };

  const handleNext = () => {
    navigate("/valuation/step7");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <PageLayout>
      <ValuationResult
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onNext={handleNext}
      />
    </PageLayout>
  );
}
