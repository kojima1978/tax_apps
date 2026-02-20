import { useNavigate } from "react-router-dom";
import { ValuationSummary } from "@/components/valuation/ValuationSummary";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function SummaryPage() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    navigate("/valuation/step8");
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleDetails = () => {
    navigate("/valuation/step10");
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
