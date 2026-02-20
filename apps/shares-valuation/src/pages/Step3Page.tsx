import { useNavigate } from "react-router-dom";
import { OwnDataForm } from "@/components/valuation/OwnDataForm";
import { Financials } from "@/types/valuation";
import { useValuationFormData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step3Page() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationFormData();

  const handleNext = (data: Partial<Financials>) => {
    // Merge with existing financials data
    const merged = { ...financials, ...data };
    sessionStorage.setItem("valuationFinancials", JSON.stringify(merged));
    navigate("/valuation/step4");
  };

  const handleBack = () => {
    navigate("/valuation/step2");
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <PageLayout narrow>
      <OwnDataForm
        basicInfo={basicInfo}
        onNext={handleNext}
        onBack={handleBack}
        defaultValues={financials || undefined}
      />
    </PageLayout>
  );
}
