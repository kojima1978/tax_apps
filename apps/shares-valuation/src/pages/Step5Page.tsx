import { useNavigate } from "react-router-dom";
import { NetAssetForm } from "@/components/valuation/NetAssetForm";
import { Financials } from "@/types/valuation";
import { useValuationFormData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function Step5Page() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationFormData();

  const handleNext = (data: Partial<Financials>) => {
    // Merge with existing financials data
    const merged = { ...financials, ...data };
    sessionStorage.setItem("valuationFinancials", JSON.stringify(merged));
    navigate("/valuation/step6");
  };

  const handleBack = () => {
    navigate("/valuation/step4");
  };

  if (!basicInfo) {
    return null; // Loading state
  }

  return (
    <PageLayout narrow>
      <NetAssetForm
        basicInfo={basicInfo as import("@/types/valuation").BasicInfo}
        onNext={handleNext}
        onBack={handleBack}
        defaultValues={financials || undefined}
      />
    </PageLayout>
  );
}
