import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BasicInfo, Financials } from "@/types/valuation";

/**
 * step6-10 用: sessionStorage から basicInfo と financials を両方ロードする。
 * どちらかが欠けている場合は step1 にリダイレクトする。
 */
export function useValuationData() {
  const navigate = useNavigate();
  const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);

  useEffect(() => {
    const savedBasic = sessionStorage.getItem("valuationBasicInfo");
    const savedFinancials = sessionStorage.getItem("valuationFinancials");

    if (savedBasic && savedFinancials) {
      try {
        setBasicInfo(JSON.parse(savedBasic));
        setFinancials(JSON.parse(savedFinancials));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        navigate("/valuation/step1");
      }
    } else {
      navigate("/valuation/step1");
    }
  }, [navigate]);

  return { basicInfo, financials };
}

/**
 * step3-5 用: sessionStorage から basicInfo (必須) と financials (任意) をロードする。
 * basicInfo が欠けている場合は step1 にリダイレクトする。
 */
export function useValuationFormData() {
  const navigate = useNavigate();
  const [basicInfo, setBasicInfo] = useState<
    BasicInfo | Partial<BasicInfo> | null
  >(null);
  const [financials, setFinancials] = useState<Partial<Financials> | null>(
    null,
  );

  useEffect(() => {
    const savedBasic = sessionStorage.getItem("valuationBasicInfo");
    const savedFinancials = sessionStorage.getItem("valuationFinancials");

    if (savedBasic) {
      try {
        setBasicInfo(JSON.parse(savedBasic));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        navigate("/valuation/step1");
        return;
      }
    } else {
      navigate("/valuation/step1");
      return;
    }

    if (savedFinancials) {
      try {
        setFinancials(JSON.parse(savedFinancials));
      } catch (e) {
        console.error("Failed to parse financials:", e);
      }
    }
  }, [navigate]);

  return { basicInfo, financials };
}
