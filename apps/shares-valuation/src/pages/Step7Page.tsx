import { useNavigate } from "react-router-dom";
import { CorporateTaxFairValue } from "@/components/valuation/CorporateTaxFairValue";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step7Page() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    navigate("/valuation/step6");
  };

  const handleNext = () => {
    navigate("/valuation/step8");
  };

  const handleHome = () => {
    navigate("/");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <PageLayout>
      <CorporateTaxFairValue
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onNext={handleNext}
        onHome={handleHome}
      />
    </PageLayout>
  );
}
