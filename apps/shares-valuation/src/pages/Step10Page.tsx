import { useNavigate } from "react-router-dom";
import { PrintAllSteps } from "@/components/valuation/PrintAllSteps";
import { Button } from "@/components/ui/Button";
import { useValuationData } from "@/hooks/useValuationData";
import { PageLayout } from "@/components/ui/PageLayout";

export default function DetailsPage() {
  const navigate = useNavigate();
  const { basicInfo, financials } = useValuationData();

  const handleBack = () => {
    navigate("/valuation/step9");
  };

  const handleHome = () => {
    navigate("/");
  };

  if (!basicInfo || !financials) {
    return null; // Loading state
  }

  return (
    <PageLayout>
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
    </PageLayout>
  );
}
