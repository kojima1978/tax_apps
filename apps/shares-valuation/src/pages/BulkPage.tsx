import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ValuationBulkInput } from "@/components/valuation/ValuationBulkInput";
import { BasicInfo, Financials } from "@/types/valuation";
import { PageLayout } from "@/components/ui/PageLayout";

export default function ValuationBulkInputPage() {
  const navigate = useNavigate();
  const [defaultBasicInfo, setDefaultBasicInfo] = useState<BasicInfo | null>(
    null,
  );
  const [defaultFinancials, setDefaultFinancials] = useState<Financials | null>(
    null,
  );

  useEffect(() => {
    // Load saved data from sessionStorage
    const savedBasic = sessionStorage.getItem("valuationBasicInfo");
    const savedFinancials = sessionStorage.getItem("valuationFinancials");

    if (savedBasic) {
      try {
        setDefaultBasicInfo(JSON.parse(savedBasic));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
      }
    }

    if (savedFinancials) {
      try {
        setDefaultFinancials(JSON.parse(savedFinancials));
      } catch (e) {
        console.error("Failed to parse financials:", e);
      }
    }
  }, []);

  const handleSubmit = (basicInfo: BasicInfo, financials: Financials) => {
    // Save to sessionStorage
    sessionStorage.setItem("valuationBasicInfo", JSON.stringify(basicInfo));
    sessionStorage.setItem("valuationFinancials", JSON.stringify(financials));
    // Navigate to result page
    navigate("/valuation/step6");
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <PageLayout>
      <ValuationBulkInput
        onSubmit={handleSubmit}
        onBack={handleBack}
        defaultBasicInfo={defaultBasicInfo}
        defaultFinancials={defaultFinancials}
      />
    </PageLayout>
  );
}
