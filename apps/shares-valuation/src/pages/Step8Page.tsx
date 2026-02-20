import { useNavigate } from "react-router-dom";
import { ValuationSimulation } from "@/components/valuation/ValuationSimulation";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step8Page() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    navigate("/valuation/step7");
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleSummary = () => {
    navigate("/valuation/step9");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <PageLayout>
      <ValuationSimulation
        basicInfo={basicInfo}
        financials={financials}
        onBack={handleBack}
        onHome={handleHome}
        onSummary={handleSummary}
      />
    </PageLayout>
  );
}
