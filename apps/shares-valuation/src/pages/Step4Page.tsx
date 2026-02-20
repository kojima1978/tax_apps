import { useNavigate } from "react-router-dom";
import { IndustryDataForm } from "@/components/valuation/IndustryDataForm";
import { Financials } from "@/types/valuation";
import { useValuationFormData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step4Page() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationFormData();

  const handleNext = (data: Partial<Financials>) => {
    // Merge with existing financials data
    const merged = { ...financials, ...data };
    sessionStorage.setItem("valuationFinancials", JSON.stringify(merged));
    navigate("/valuation/step5");
  };

  const handleBack = () => {
    navigate("/valuation/step3");
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <PageLayout narrow>
      <IndustryDataForm
        basicInfo={basicInfo as import("@/types/valuation").BasicInfo}
        onNext={handleNext}
        onBack={handleBack}
        defaultValues={financials || undefined}
      />
    </PageLayout>
  );
}
