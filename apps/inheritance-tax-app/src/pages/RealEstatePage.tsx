import { useRef } from 'react';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { RealEstateInvestmentForm } from '../components/realEstate/RealEstateInvestmentForm';
import { RealEstateResult } from '../components/realEstate/RealEstateResult';
import { REAL_ESTATE_CAUTIONS } from '../constants/cautionMessages';
import { useFormValidation } from '../hooks/useFormValidation';
import { useRealEstateSimulation } from '../hooks/useRealEstateSimulation';
import { useScrollToResult } from '../hooks/useScrollToResult';

export const RealEstatePage: React.FC = () => {
  const {
    composition, setComposition,
    estateValue, setEstateValue,
    spouseMode, setSpouseMode,
    investment, updateInvestment,
    result,
    handleCalculate: executeCalculate,
  } = useRealEstateSimulation();

  const estateRef = useRef<HTMLDivElement>(null);
  const investmentRef = useRef<HTMLDivElement>(null);
  const resultRef = useScrollToResult(result !== null);
  const purchasePrice = investment.landPurchasePrice + investment.buildingPurchasePrice;
  const rateInvalid = [
    investment.leaseholdRightRate,
    investment.tenantRightRate,
    investment.rentalRate,
  ].some(rate => rate < 0 || rate > 100);
  const landValueMissing = investment.landPurchasePrice > 0 && investment.landSelfUseValue <= 0;
  const buildingValueMissing = investment.buildingPurchasePrice > 0 && investment.buildingFixedAssetTaxValue <= 0;
  const investmentInvalid = purchasePrice <= 0 || landValueMissing || buildingValueMissing || rateInvalid;

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '遺産総額を入力してください' },
    { condition: purchasePrice <= 0, ref: investmentRef, message: '土地または建物の購入価格を入力してください' },
    { condition: landValueMissing, ref: investmentRef, message: '土地を購入する場合は自用地評価額を入力してください' },
    { condition: buildingValueMissing, ref: investmentRef, message: '建物を購入する場合は固定資産税評価額を入力してください' },
    { condition: purchasePrice > estateValue && estateValue > 0, ref: investmentRef, message: '購入価格が遺産総額を超えています。この試算では現金の範囲内で入力してください' },
    { condition: rateInvalid, ref: investmentRef, message: '借地権割合・借家権割合・賃貸割合は0〜100%で入力してください' },
  ], executeCalculate);

  return (
    <PageLayout
      printClassName="real-estate-print"
      leftSection={<HeirSettings composition={composition} onChange={setComposition} />}
      rightSection={
        <>
          <div ref={estateRef}>
            <EstateInput
              value={estateValue}
              onChange={setEstateValue}
              label="遺産総額（不動産購入前の相続財産額）"
              placeholder="例: 20000"
              hasError={hasAttempted && estateValue <= 0}
            />
          </div>
          <SpouseAcquisitionSettings
            value={spouseMode}
            onChange={setSpouseMode}
            hasSpouse={composition.hasSpouse}
          />
          <CautionBox items={REAL_ESTATE_CAUTIONS} collapsible />
        </>
      }
      middleSection={
        <div ref={investmentRef} className="mb-8 no-print">
          <RealEstateInvestmentForm
            value={investment}
            onChange={updateInvestment}
            hasError={hasAttempted && investmentInvalid}
          />
        </div>
      }
      validationErrors={validationErrors}
      hasAttempted={hasAttempted}
      onCalculate={handleCalculate}
      calculateButtonLabel="入力内容で計算"
      belowButton={
        result === null && estateValue > 0 && !hasAttempted ? (
          <StatusCard
            variant="success"
            title="賃貸不動産の条件を入力してください"
            description="購入価格と相続税評価の基礎額を入力すると、購入前後の税額を比較できます。"
            className="no-print"
          />
        ) : undefined
      }
      resultRef={resultRef}
      resultSection={result !== null ? <div className="result-fade-in"><RealEstateResult result={result} /></div> : null}
    />
  );
};
