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
  const rateInvalid = [
    investment.compressionRate,
    investment.leaseholdRightRate,
    investment.tenantRightRate,
  ].some(rate => rate < 0 || rate > 100);
  const investmentInvalid = investment.investmentAmount <= 0 || rateInvalid;

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '遺産総額を入力してください' },
    { condition: investment.investmentAmount <= 0, ref: investmentRef, message: '投下資金を入力してください' },
    { condition: investment.investmentAmount > estateValue && estateValue > 0, ref: investmentRef, message: '投下資金が遺産総額を超えています' },
    { condition: rateInvalid, ref: investmentRef, message: '圧縮率・借地権割合・借家権割合は0〜100%で入力してください' },
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
            description="投下資金・圧縮率・借地権割合・借家権割合から、対策前後の相続税を比較できます。"
            className="no-print"
          />
        ) : undefined
      }
      resultRef={resultRef}
      resultSection={result !== null ? <div className="result-fade-in"><RealEstateResult result={result} /></div> : null}
    />
  );
};
